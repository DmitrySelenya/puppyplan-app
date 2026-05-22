// design-canvas-print.jsx — Print-mode drop-in replacement for design-canvas.jsx
// Exports the same window globals (DesignCanvas / DCSection / DCArtboard / DCPostIt)
// but renders each artboard as its own paged sheet: section head on top,
// artboard centered and scaled to fit, label at the bottom. Tall artboards
// (e.g. the library spec sheet) flow across multiple pages.

// Letter landscape at 96dpi.
const PRINT_PAGE_W = 1056;
const PRINT_PAGE_H = 816;
const PRINT_MARGIN_X = 40;
const PRINT_HEAD_H = 64;
const PRINT_FOOT_H = 40;
const PRINT_MAX_W = PRINT_PAGE_W - PRINT_MARGIN_X * 2;
const PRINT_MAX_H = PRINT_PAGE_H - PRINT_HEAD_H - PRINT_FOOT_H - 32;

if (typeof document !== 'undefined' && !document.getElementById('dc-print-styles')) {
  const s = document.createElement('style');
  s.id = 'dc-print-styles';
  s.textContent = [
    'html,body{margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;}',
    '@page{size:' + PRINT_PAGE_W + 'px ' + PRINT_PAGE_H + 'px;margin:0;}',
    '.pp-print-doc{background:#fff;}',
    '.pp-print-page{width:' + PRINT_PAGE_W + 'px;height:' + PRINT_PAGE_H + 'px;',
    '  box-sizing:border-box;position:relative;overflow:hidden;background:#fff;',
    '  display:flex;flex-direction:column;align-items:center;justify-content:center;',
    '  page-break-after:always;break-after:page;page-break-inside:avoid;break-inside:avoid;}',
    '.pp-print-page.tall{height:auto;min-height:' + PRINT_PAGE_H + 'px;align-items:center;justify-content:flex-start;',
    '  padding:' + (PRINT_HEAD_H + 16) + 'px ' + PRINT_MARGIN_X + 'px ' + (PRINT_FOOT_H + 12) + 'px;',
    '  page-break-inside:auto;break-inside:auto;}',
    '.pp-print-doc > .pp-print-page:last-child{page-break-after:auto;break-after:auto;}',
    '.pp-print-head{position:absolute;top:24px;left:' + PRINT_MARGIN_X + 'px;right:' + PRINT_MARGIN_X + 'px;}',
    '.pp-print-head .ttl{font-size:18px;font-weight:600;letter-spacing:-.3px;color:rgba(40,30,20,.92);}',
    '.pp-print-head .sub{font-size:12px;color:rgba(60,50,40,.6);margin-top:2px;}',
    '.pp-print-head .crumb{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(60,50,40,.45);margin-bottom:4px;}',
    '.pp-print-foot{position:absolute;bottom:18px;left:' + PRINT_MARGIN_X + 'px;right:' + PRINT_MARGIN_X + 'px;',
    '  display:flex;align-items:baseline;justify-content:space-between;gap:16px;',
    '  font-size:11px;color:rgba(60,50,40,.65);}',
    '.pp-print-foot .lbl{font-weight:500;color:rgba(40,30,20,.85);}',
    '.pp-print-foot .pg{font-variant-numeric:tabular-nums;color:rgba(60,50,40,.5);}',
    '.pp-print-frame{position:relative;background:#fff;overflow:hidden;',
    '  box-shadow:0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06);border-radius:2px;}',
    '.pp-print-frame > .pp-print-inner{transform-origin:top left;background:#fff;}',
    '.pp-print-cover{width:' + PRINT_PAGE_W + 'px;height:' + PRINT_PAGE_H + 'px;display:flex;',
    '  flex-direction:column;align-items:center;justify-content:center;text-align:center;',
    '  page-break-after:always;break-after:page;background:#f6f4ef;}',
    '.pp-print-cover h1{font-size:36px;font-weight:700;margin:0 0 12px;letter-spacing:-.8px;color:#29261b;}',
    '.pp-print-cover p{font-size:14px;color:rgba(60,50,40,.7);margin:0;max-width:540px;line-height:1.5;}',
    '.pp-print-cover .meta{margin-top:32px;font-size:11px;color:rgba(60,50,40,.5);letter-spacing:.06em;text-transform:uppercase;}',
    '@media print{',
    '  .pp-print-page,.pp-print-cover{background:#fff !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}',
    '  .pp-print-frame{box-shadow:0 0 0 1px rgba(0,0,0,.08);}',
    '}',
    '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}',
  ].join('\n');
  document.head.appendChild(s);
}

function dcFlatten(children) {
  const out = [];
  React.Children.forEach(children, (c) => {
    if (c && c.type === React.Fragment) out.push(...dcFlatten(c.props.children));
    else out.push(c);
  });
  return out;
}

// Module-scoped counter is reset on each DesignCanvas render so page numbers
// stay sequential across the whole document (sections + artboards).
let __pageCounter = 0;

function DesignCanvas({ children }) {
  __pageCounter = 0;
  // Collect all sections (in source order) and count total pages for the
  // page-number footer. Tall artboards still count as one logical page slot;
  // CSS handles the natural overflow.
  const sections = dcFlatten(children).filter((c) => c && c.type === DCSection);
  let total = 0;
  sections.forEach((sec) => {
    dcFlatten(sec.props.children).forEach((c) => { if (c && c.type === DCArtboard) total++; });
  });

  return (
    <div className="pp-print-doc">
      <div className="pp-print-cover">
        <h1>PuppyPlan v1</h1>
        <p>Screen set · iPhone 393×852 · light mode · built against design-tokens.json + STRINGS.en.json</p>
        <div className="meta">{total} artboards · {sections.length} sections</div>
      </div>
      {sections.map((sec) => (
        <DCSection key={sec.props.id ?? sec.props.title} {...sec.props} __total={total} />
      ))}
    </div>
  );
}

function DCSection({ id, title, subtitle, children, __total }) {
  const arts = dcFlatten(children).filter((c) => c && c.type === DCArtboard);
  return (
    <>
      {arts.map((a, i) => {
        __pageCounter++;
        return (
          <PrintPage
            key={(a.props.id ?? a.props.label ?? '') + '|' + i}
            sectionId={id}
            sectionTitle={title}
            sectionSubtitle={subtitle}
            artboard={a}
            pageNum={__pageCounter}
            pageTotal={__total}
          />
        );
      })}
    </>
  );
}

function DCArtboard() { return null; }
function DCPostIt() { return null; }

function PrintPage({ sectionId, sectionTitle, sectionSubtitle, artboard, pageNum, pageTotal }) {
  const { width = 260, height = 480, children, label, id, style = {} } = artboard.props;
  const aid = id ?? label;

  // Scale to fit page area, never up-scaling.
  const scaleW = PRINT_MAX_W / width;
  const scaleH = PRINT_MAX_H / height;
  const fitScale = Math.min(scaleW, scaleH, 1);
  const tall = height * Math.min(scaleW, 1) > PRINT_MAX_H + 40;
  const scale = tall ? Math.min(scaleW, 1) : fitScale;
  const scaledW = width * scale;
  const scaledH = height * scale;

  return (
    <div className={'pp-print-page' + (tall ? ' tall' : '')}>
      <div className="pp-print-head">
        <div className="crumb">{sectionId || sectionTitle}</div>
        <div className="ttl">{sectionTitle}</div>
        {sectionSubtitle && <div className="sub">{sectionSubtitle}</div>}
      </div>
      <div className="pp-print-frame" style={{ width: scaledW, height: scaledH, ...style }}>
        <div className="pp-print-inner" style={{ width, height, transform: 'scale(' + scale + ')' }}>
          {children}
        </div>
      </div>
      <div className="pp-print-foot">
        <span className="lbl">{label}</span>
        <span className="pg">{pageNum} / {pageTotal}</span>
      </div>
    </div>
  );
}

Object.assign(window, { DesignCanvas, DCSection, DCArtboard, DCPostIt });
