// PuppyPlan — primitive components.
// All tokens via tokens.css custom properties. Strings come from STRINGS.en.json
// (verbatim). Components are sized for an iPhone 393×852 canvas.

// ────────────────────────────────────────────────────────────────
// Phone shell
// ────────────────────────────────────────────────────────────────
function Phone({ children, scrim = false, style }) {
  return (
    <div className="pp-app pp-phone" style={style}>
      <StatusBar />
      <div style={{ position: 'absolute', inset: '47px 0 0 0', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      {scrim && <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,26,24,0.32)', pointerEvents: 'none' }} />}
    </div>
  );
}

function StatusBar({ time = "9:41" }) {
  return (
    <div className="pp-status-bar">
      <span>{time}</span>
      <div className="pp-sb-right">
        {/* Cell, wifi, battery glyphs */}
        <svg width="18" height="11" viewBox="0 0 18 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="0.5"/><rect x="4.5" y="5" width="3" height="6" rx="0.5"/><rect x="9" y="3" width="3" height="8" rx="0.5"/><rect x="13.5" y="0.5" width="3" height="10.5" rx="0.5"/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 4.5A9 9 0 0 1 14 4.5"/><path d="M4 6.5A6 6 0 0 1 12 6.5"/><path d="M6 8.5A3 3 0 0 1 10 8.5"/><circle cx="8" cy="10" r="0.6" fill="currentColor"/></svg>
        <svg width="26" height="12" viewBox="0 0 26 12"><rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.4"/><rect x="2" y="2" width="18" height="8" rx="1.5" fill="currentColor"/><rect x="23" y="4" width="1.5" height="4" rx="0.5" fill="currentColor" fillOpacity="0.4"/></svg>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Buttons
// ────────────────────────────────────────────────────────────────
function Button({ variant = 'primary', children, block, leading, trailing, size, style, ...rest }) {
  const cls = `pp-btn pp-btn-${variant}${block ? ' pp-btn-block' : ''}`;
  const sizeStyle = size === 'lg' ? { minHeight: 56, fontSize: 17 } : {};
  return (
    <button className={cls} style={{ ...sizeStyle, ...style }} {...rest}>
      {leading}
      <span>{children}</span>
      {trailing}
    </button>
  );
}

function TextLink({ children, color, style }) {
  return <span style={{ color: color || 'var(--pp-text-link)', fontSize: 17, fontWeight: 400, ...style }}>{children}</span>;
}

// ────────────────────────────────────────────────────────────────
// Pills (status / scope)
// ────────────────────────────────────────────────────────────────
const PILL_PRESETS = {
  template:        { fill: 'var(--pp-pill-template-fill)',  text: 'var(--pp-pill-template-text)',  icon: 'status.template' },
  'needs-review':  { fill: 'var(--pp-pill-review-fill)',    text: 'var(--pp-pill-review-text)',    icon: 'status.review' },
  confirmed:       { fill: 'var(--pp-pill-confirmed-fill)', text: 'var(--pp-pill-confirmed-text)', icon: 'status.confirmed' },
  completed:       { fill: 'var(--pp-pill-completed-fill)', text: 'var(--pp-pill-completed-text)', icon: 'status.completed' },
  pending:         { fill: 'var(--pp-pill-pending-fill)',   text: 'var(--pp-pill-pending-text)',   icon: 'info.circle' },
  failed:          { fill: 'var(--pp-pill-failed-fill)',    text: 'var(--pp-pill-failed-text)',    icon: 'ui.exclamation.circle' },
  urgent:          { fill: 'var(--pp-pill-urgent-fill)',    text: 'var(--pp-pill-urgent-text)',    icon: 'status.urgent_flag' },
  info:            { fill: 'var(--pp-info-tint)',           text: 'var(--pp-info)',                icon: 'info.circle' },
  success:         { fill: 'var(--pp-success-tint)',        text: 'var(--pp-success)',             icon: 'check' },
  warning:         { fill: 'var(--pp-warning-tint)',        text: 'var(--pp-warning)',             icon: 'ui.exclamation.circle' },
};

function Pill({ tone = 'template', icon, children, style }) {
  const p = PILL_PRESETS[tone] || PILL_PRESETS.template;
  return (
    <span
      className="pp-pill"
      style={{ background: p.fill, color: p.text, ...style }}
    >
      <Icon name={icon || p.icon} size={14} stroke={2} />
      {children}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────
// Cards
// ────────────────────────────────────────────────────────────────
function Card({ children, padding = 16, style, ...rest }) {
  return (
    <div className="pp-card" style={{ padding, ...style }} {...rest}>
      {children}
    </div>
  );
}

// Hero card — surface/raised, one primary CTA + optional tertiary link
function HeroCard({ eyebrow, title, body, primary, primaryAction, tertiary, tertiaryAction, illustration, tone = 'default' }) {
  const tinted = tone === 'celebration';
  return (
    <Card
      style={{
        background: tinted ? 'var(--pp-accent-100)' : 'var(--pp-surface-raised)',
        borderColor: tinted ? 'transparent' : 'var(--pp-stroke)',
        padding: 20,
      }}
    >
      {eyebrow && <div className="pp-caption" style={{ color: 'var(--pp-text-tertiary)', marginBottom: 6 }}>{eyebrow}</div>}
      {illustration}
      <div className="pp-title-3" style={{ marginBottom: 6, color: tinted ? 'var(--pp-accent-700)' : 'var(--pp-text-primary)' }}>{title}</div>
      {body && <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginBottom: 16 }}>{body}</div>}
      {primary && (
        <Button variant="primary" block onClick={primaryAction}>{primary}</Button>
      )}
      {tertiary && (
        <div style={{ textAlign: 'center', paddingTop: 12 }}>
          <TextLink>{tertiary}</TextLink>
        </div>
      )}
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────
// Lists
// ────────────────────────────────────────────────────────────────
function List({ children, style }) {
  return <div className="pp-list" style={style}>{children}</div>;
}

// ListRow — semantically a button when onClick / chevron is present, otherwise a plain row.
// VoiceOver contract: accessibilityRole="button", accessibilityLabel = `${title}. ${subtitle}` when interactive.
function ListRow({ leading, title, subtitle, meta, trailing, chevron, onClick, danger, style, ariaLabel }) {
  const interactive = !!(onClick || chevron);
  const a11y = interactive
    ? {
        role: 'button',
        tabIndex: 0,
        'aria-label': ariaLabel || [title, subtitle].filter(Boolean).join('. '),
        onKeyDown: (e) => { if ((e.key === 'Enter' || e.key === ' ') && onClick) { e.preventDefault(); onClick(e); } },
      }
    : {};
  return (
    <div
      className={`pp-list-row${interactive ? ' pp-interactive' : ''}`}
      onClick={onClick}
      style={style}
      {...a11y}
    >
      {leading && <div style={{ flex: '0 0 auto' }} aria-hidden="true">{leading}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pp-headline" style={{ color: danger ? 'var(--pp-danger)' : 'var(--pp-text-primary)' }}>{title}</div>
        {subtitle && <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {meta && <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)' }}>{meta}</div>}
      {trailing}
      {chevron && <Icon name="chevron.right" size={20} color="var(--pp-text-tertiary)" stroke={1.75} aria-hidden="true" />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Form fields
// ────────────────────────────────────────────────────────────────
function Field({ label, value, placeholder, helper, error, focused, trailing, style }) {
  return (
    <div style={style}>
      {label && <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 6 }}>{label}</div>}
      <div className={`pp-field ${focused ? 'is-focused' : ''} ${error ? 'is-error' : ''}`}>
        <div style={{ flex: 1, color: value ? 'var(--pp-text-primary)' : 'var(--pp-text-tertiary)' }}>{value || placeholder}</div>
        {trailing}
        {focused && <div style={{ width: 2, height: 18, background: 'var(--pp-primary-500)', animation: 'pp-blink 1s infinite' }} />}
      </div>
      {(helper || error) && (
        <div className="pp-footnote" style={{ color: error ? 'var(--pp-danger)' : 'var(--pp-text-tertiary)', marginTop: 6 }}>
          {error || helper}
        </div>
      )}
    </div>
  );
}

function Toggle({ on }) {
  return (
    <div style={{
      width: 51, height: 31, borderRadius: 999,
      background: on ? 'var(--pp-success)' : 'var(--pp-stroke-strong)',
      position: 'relative', flex: '0 0 auto',
      transition: 'background .2s',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 22 : 2,
        width: 27, height: 27, borderRadius: 999, background: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'left .2s',
      }} />
    </div>
  );
}

// Segment — ARIA tablist semantics; each option is a tab.
// VoiceOver: "Segmented control. <option>, <i> of <n>, selected."
function Segment({ options, value, onChange, ariaLabel, style }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel || 'Segmented control'}
      style={{
        background: 'var(--pp-surface-sunken)', borderRadius: 9,
        padding: 2, display: 'flex', gap: 2, ...style,
      }}
    >
      {options.map((opt, i) => {
        const selected = opt === value;
        return (
          <div
            key={opt}
            role="tab"
            tabIndex={selected ? 0 : -1}
            aria-selected={selected}
            aria-posinset={i + 1}
            aria-setsize={options.length}
            className="pp-segment-option pp-interactive"
            onClick={() => onChange && onChange(opt)}
            onKeyDown={(e) => {
              if (!onChange) return;
              if (e.key === 'ArrowRight') { e.preventDefault(); onChange(options[(i + 1) % options.length]); }
              if (e.key === 'ArrowLeft')  { e.preventDefault(); onChange(options[(i - 1 + options.length) % options.length]); }
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(opt); }
            }}
            style={{
              flex: 1, padding: '7px 10px', textAlign: 'center',
              background: selected ? 'var(--pp-surface-raised)' : 'transparent',
              color: selected ? 'var(--pp-text-primary)' : 'var(--pp-text-secondary)',
              borderRadius: 7, fontSize: 14, fontWeight: selected ? 600 : 500,
              boxShadow: selected ? '0 1px 2px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04)' : 'none',
              cursor: 'pointer',
            }}
          >{opt}</div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Tracker tile
// ────────────────────────────────────────────────────────────────
// TrackerTile — acts as a checkbox in the picker / button in Quick Log.
// VoiceOver: "<label>, <selected | not selected>, checkbox" with a11y hint = "Adds to your daily trackers."
function TrackerTile({ icon, label, selected, pending, onClick, style, size = 'three-col', role = 'checkbox' }) {
  const dims = size === 'two-col'
    ? { width: 168, height: 96 }
    : { width: '100%', height: 96 };
  return (
    <div
      className={`pp-tile pp-interactive ${selected ? 'is-selected' : ''}`}
      role={role}
      tabIndex={0}
      aria-checked={role === 'checkbox' ? !!selected : undefined}
      aria-pressed={role === 'button' ? !!selected : undefined}
      aria-label={label}
      aria-busy={pending || undefined}
      onClick={onClick}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onClick) { e.preventDefault(); onClick(e); } }}
      style={{ ...dims, ...style }}
    >
      <Icon name={icon} size={28} stroke={1.75} color={selected ? 'var(--pp-primary-700)' : 'var(--pp-text-primary)'} aria-hidden="true" />
      <div className="pp-tile-label" style={{ color: selected ? 'var(--pp-primary-700)' : 'var(--pp-text-primary)' }}>{label}</div>
      {selected && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 18, height: 18, borderRadius: 999,
          background: 'var(--pp-primary-600)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="check" size={12} stroke={3} />
        </div>
      )}
      {pending && (
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <Pill tone="pending" icon="info.circle" style={{ fontSize: 10, height: 18, padding: '0 6px' }}>Saving</Pill>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Avatar
// ────────────────────────────────────────────────────────────────
function Avatar({ initial, size = 'md', tone = 'primary' }) {
  const cls = size === 'lg' ? 'pp-avatar pp-avatar-lg' : size === 'xl' ? 'pp-avatar pp-avatar-xl' : 'pp-avatar';
  const tones = {
    primary: { bg: 'var(--pp-primary-200)', fg: 'var(--pp-primary-800)' },
    accent:  { bg: 'var(--pp-accent-100)',  fg: 'var(--pp-accent-700)' },
    sunken:  { bg: 'var(--pp-surface-sunken)', fg: 'var(--pp-text-secondary)' },
    info:    { bg: 'var(--pp-info-tint)', fg: 'var(--pp-info)' },
    success: { bg: 'var(--pp-success-tint)', fg: 'var(--pp-success)' },
  };
  const t = tones[tone] || tones.primary;
  return <span className={cls} style={{ background: t.bg, color: t.fg }}>{initial}</span>;
}

function AvatarCluster({ initials, size = 'md' }) {
  const px = size === 'lg' ? 40 : 32;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {initials.map((i, idx) => (
        <Avatar key={idx} initial={i} size={size} tone={idx % 2 ? 'sunken' : 'primary'}
          style={{ marginLeft: idx ? -10 : 0, boxShadow: '0 0 0 2px var(--pp-surface-raised)' }} />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Tab bar + FAB
// ────────────────────────────────────────────────────────────────
// TabBar — ARIA tablist with bottom-nav semantics.
// VoiceOver: "Tab bar" → each tab "Today, tab, 1 of 3, selected."
function TabBar({ active = 'today', onChange }) {
  const tabs = [
    { id: 'today',  label: 'Today',  icon: 'nav.today' },
    { id: 'health', label: 'Health', icon: 'nav.health' },
    { id: 'more',   label: 'More',   icon: 'nav.more' },
  ];
  return (
    <>
      <div className="pp-tabbar" role="tablist" aria-label="Primary">
        {tabs.map((t, i) => {
          const selected = active === t.id;
          return (
            <div
              key={t.id}
              className={`pp-tab pp-interactive ${selected ? 'is-active' : ''}`}
              role="tab"
              tabIndex={selected ? 0 : -1}
              aria-selected={selected}
              aria-label={t.label}
              aria-posinset={i + 1}
              aria-setsize={tabs.length}
              onClick={() => onChange && onChange(t.id)}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onChange) { e.preventDefault(); onChange(t.id); } }}
            >
              <Icon name={t.icon} size={26} stroke={selected ? 2 : 1.75} filled={selected} aria-hidden="true" />
              <span>{t.label}</span>
            </div>
          );
        })}
      </div>
      <div className="pp-tabbar-safe">
        <div style={{ width: 134, height: 5, borderRadius: 5, background: '#1C1F1B', margin: '24px auto 0' }} />
      </div>
    </>
  );
}

// FAB — actually a button. VoiceOver label = `label` || "Quick log".
function FAB({ icon = 'action.quick_log', label = 'Quick log', onClick, style }) {
  return (
    <div style={{
      position: 'absolute', right: 16, bottom: 49 + 34 + 8, zIndex: 20,
      ...style,
    }}>
      <button
        type="button"
        className="pp-interactive"
        aria-label={label}
        onClick={onClick}
        style={{
          width: 56, height: 56, borderRadius: 999,
          background: 'var(--pp-primary-600)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 16px rgba(28,31,27,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
          border: 0, padding: 0, cursor: 'pointer',
        }}
      >
        <Icon name={icon} size={28} stroke={2.25} color="#fff" aria-hidden="true" />
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Snackbar
// ────────────────────────────────────────────────────────────────
function Snackbar({ children, action, secondary, style }) {
  return (
    <div className="pp-snack" style={style}>
      <Icon name="check" size={18} stroke={2.25} color="var(--pp-primary-300)" />
      <span style={{ flex: 1 }}>{children}</span>
      {secondary && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{secondary}</span>}
      {action && <span className="pp-snack-action">{action}</span>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Sections / labels for layouts
// ────────────────────────────────────────────────────────────────
function SectionHeader({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '4px 4px 8px' }}>
      <div className="pp-subheadline" style={{ color: 'var(--pp-text-tertiary)', fontWeight: 500, letterSpacing: 0.2, textTransform: 'uppercase', fontSize: 13 }}>{children}</div>
      {action && <span className="pp-footnote" style={{ color: 'var(--pp-text-link)' }}>{action}</span>}
    </div>
  );
}

// Banner (offline / error / info)
function Banner({ tone = 'info', icon, children, action }) {
  const tones = {
    info:    { fill: 'var(--pp-info-tint)',   text: 'var(--pp-info)',  border: 'transparent', defaultIcon: 'info.circle' },
    warning: { fill: 'var(--pp-warning-tint)', text: 'var(--pp-warning)', border: 'transparent', defaultIcon: 'ui.exclamation.circle' },
    offline: { fill: 'var(--pp-surface-sunken)', text: 'var(--pp-text-secondary)', border: 'transparent', defaultIcon: 'ui.wifi.slash' },
    failed:  { fill: 'var(--pp-danger-tint)', text: 'var(--pp-danger)', border: 'transparent', defaultIcon: 'ui.exclamation.circle' },
  };
  const t = tones[tone];
  return (
    <div style={{
      background: t.fill, color: t.text, borderRadius: 12,
      padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 14, lineHeight: '20px',
    }}>
      <Icon name={icon || t.defaultIcon} size={18} stroke={2} />
      <span style={{ flex: 1 }}>{children}</span>
      {action && <span style={{ fontWeight: 600 }}>{action}</span>}
    </div>
  );
}

// Activity strip — household attribution
function ActivityStrip({ children, pulse }) {
  return (
    <div className="pp-strip" style={{
      borderColor: pulse ? 'var(--pp-primary-300)' : 'var(--pp-stroke)',
      boxShadow: pulse ? '0 0 0 2px rgba(8,145,178,0.16)' : 'none',
    }}>
      <Icon name="person.cluster" size={18} stroke={1.75} color="var(--pp-text-tertiary)" />
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
}

// Skeleton bar
function Skel({ w = '100%', h = 14, r = 7, style }) {
  return <div className="pp-skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// Section group title for canvas annotation
function FrameLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--pp-font-mono)', fontSize: 11,
      color: 'var(--pp-text-tertiary)', marginBottom: 8,
    }}>{children}</div>
  );
}

// Keyframes injection
if (typeof document !== 'undefined' && !document.getElementById('pp-keyframes')) {
  const s = document.createElement('style');
  s.id = 'pp-keyframes';
  s.textContent = `
    @keyframes pp-blink { 0%,50% { opacity: 1 } 50.1%,100% { opacity: 0 } }
    @keyframes pp-shimmer { 0% { background-position: -200px 0 } 100% { background-position: calc(100% + 200px) 0 } }
    .pp-skel { background: linear-gradient(90deg, var(--pp-surface-sunken) 0%, #EAE3D5 50%, var(--pp-surface-sunken) 100%); background-size: 400px 100%; animation: pp-shimmer 1.4s linear infinite; }
  `;
  document.head.appendChild(s);
}

Object.assign(window, {
  Phone, StatusBar, Button, TextLink, Pill, Card, HeroCard,
  List, ListRow, Field, Toggle, Segment, TrackerTile,
  Avatar, AvatarCluster, TabBar, FAB, Snackbar, SectionHeader,
  Banner, ActivityStrip, Skel, FrameLabel,
});
