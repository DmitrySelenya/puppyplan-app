// PuppyPlan — Section 16: Global screen states reference (DESIGN.md §1.10)
// 7 canonical states · exact strings from STRINGS.en.json `states.*`

function StateFrame({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="pp-caption" style={{
        color: 'var(--pp-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: 600,
        fontFamily: 'var(--pp-font-mono)',
      }}>{label}</div>
      {children}
    </div>
  );
}

// Smaller phone-sized vignette for each state (393 wide is too big × 8).
function MiniPhone({ children, w = 280, h = 460 }) {
  return (
    <div className="pp-app" style={{
      width: w, height: h,
      background: 'var(--pp-surface-base)',
      borderRadius: 24,
      border: '1px solid var(--pp-stroke)',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: 'var(--pp-font)',
      color: 'var(--pp-text-primary)',
    }}>
      <div style={{ padding: '16px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
        <span>9:41</span>
        <span style={{ width: 70, height: 22, borderRadius: 14, background: '#000' }} />
        <span style={{ width: 40 }} />
      </div>
      <div style={{ padding: '0 16px 16px', height: 'calc(100% - 47px)', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

function CenteredState({ icon, title, body, primary, secondary, iconTone = 'sunken' }) {
  const tones = {
    sunken: 'var(--pp-surface-sunken)',
    info: 'var(--pp-info-tint)',
    warning: 'var(--pp-warning-tint)',
    failed: 'var(--pp-danger-tint)',
  };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 16px' }}>
      <div style={{
        width: 72, height: 72, borderRadius: 999,
        background: tones[iconTone], display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Icon name={icon} size={32} stroke={1.5} color="var(--pp-text-secondary)" />
      </div>
      <div className="pp-title-3" style={{ marginBottom: 6 }}>{title}</div>
      <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginBottom: 20, fontSize: 15, lineHeight: '22px' }}>{body}</div>
      {primary && <Button variant="primary">{primary}</Button>}
      {secondary && <div style={{ marginTop: 10 }}><TextLink>{secondary}</TextLink></div>}
    </div>
  );
}

function StatesFrame() {
  return (
    <div className="pp-app" style={{
      width: 1200, padding: 32,
      background: 'var(--pp-surface-base)',
      color: 'var(--pp-text-primary)',
      fontFamily: 'var(--pp-font)',
      border: '1px solid var(--pp-stroke)',
      borderRadius: 12,
    }}>
      <div className="pp-display" style={{ fontSize: 32, lineHeight: '38px', marginBottom: 4 }}>Global screen states</div>
      <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginBottom: 28, maxWidth: 700 }}>
        Every screen must define these 8 templates. Copy is verbatim from <code style={{ fontFamily: 'var(--pp-font-mono)', fontSize: 14 }}>STRINGS.en.json `states.*`</code> — no paraphrasing, no exclamation marks, no shame language.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28 }}>
        {/* Loading */}
        <StateFrame label="01 loading">
          <MiniPhone>
            <Skel w="60%" h={28} style={{ margin: '8px 0' }} />
            <Skel w="40%" h={14} style={{ marginBottom: 16 }} />
            <div style={{ background: 'var(--pp-surface-raised)', border: '1px solid var(--pp-stroke)', borderRadius: 12, padding: 14 }}>
              <Skel w="80%" h={18} />
              <div style={{ height: 6 }} />
              <Skel w="90%" h={14} />
              <div style={{ height: 6 }} />
              <Skel w="60%" h={14} />
              <div style={{ height: 14 }} />
              <Skel w="100%" h={36} r={8} />
            </div>
            <div style={{ height: 12 }} />
            {[1,2].map(i => (
              <div key={i} style={{ padding: 12, borderTop: i > 1 ? '1px solid var(--pp-stroke)' : 0, display: 'flex', gap: 10, alignItems: 'center', background: 'var(--pp-surface-raised)', border: '1px solid var(--pp-stroke)', borderRadius: 12, marginBottom: 8 }}>
                <Skel w={22} h={22} r={11} />
                <div style={{ flex: 1 }}>
                  <Skel w="60%" h={12} />
                  <div style={{ height: 4 }} />
                  <Skel w="40%" h={10} />
                </div>
              </div>
            ))}
          </MiniPhone>
        </StateFrame>

        {/* Empty first-run */}
        <StateFrame label="02 empty · first-run">
          <MiniPhone>
            <CenteredState
              icon="ui.doc.text"
              title="Your events will appear here"
              body="Add your first event — patterns get clearer once there's data."
              primary="Add an entry"
            />
          </MiniPhone>
        </StateFrame>

        {/* Empty filtered */}
        <StateFrame label="03 empty · filtered">
          <MiniPhone>
            <CenteredState
              icon="action.search"
              title="Nothing here"
              body="Try a different range or clear the filters."
              primary="Clear filters"
            />
          </MiniPhone>
        </StateFrame>

        {/* Error server */}
        <StateFrame label="04 error · server">
          <MiniPhone>
            <CenteredState
              icon="ui.exclamation.circle"
              iconTone="warning"
              title="Couldn't load"
              body="Check your connection and give it another try."
              primary="Try again"
            />
          </MiniPhone>
        </StateFrame>

        {/* Offline read */}
        <StateFrame label="05 offline · read">
          <MiniPhone>
            <Banner tone="offline">Showing your last saved data.</Banner>
            <div style={{ height: 12 }} />
            <div style={{ background: 'var(--pp-surface-raised)', border: '1px solid var(--pp-stroke)', borderRadius: 12, padding: 12 }}>
              <div className="pp-headline" style={{ fontSize: 14 }}>Feeding · 60 g</div>
              <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 2 }}>7:30 · synced earlier today</div>
            </div>
            <div style={{ height: 8 }} />
            <div style={{ background: 'var(--pp-surface-raised)', border: '1px solid var(--pp-stroke)', borderRadius: 12, padding: 12 }}>
              <div className="pp-headline" style={{ fontSize: 14 }}>Pee outside</div>
              <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 2 }}>6:08 · synced earlier today</div>
            </div>
            <div style={{ flex: 1 }} />
            <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', textAlign: 'center', paddingBottom: 12 }}>
              Last sync 9:31. Changes saved locally.
            </div>
          </MiniPhone>
        </StateFrame>

        {/* Pending write */}
        <StateFrame label="06 pending · write">
          <MiniPhone>
            <div className="pp-title-1" style={{ fontSize: 22, lineHeight: '26px', marginTop: 4 }}>Today</div>
            <div style={{ height: 16 }} />
            <div style={{ background: 'var(--pp-surface-raised)', border: '1px solid var(--pp-stroke)', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="potty.outside" size={22} />
              <div style={{ flex: 1 }}>
                <div className="pp-headline" style={{ fontSize: 14 }}>Pee outside · 9:42</div>
                <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 2 }}>just now</div>
              </div>
              <Pill tone="pending">Saving</Pill>
            </div>
            <div style={{ height: 8 }} />
            <div style={{ background: 'var(--pp-surface-raised)', border: '1px solid var(--pp-stroke)', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="feeding.bowl" size={22} />
              <div style={{ flex: 1 }}>
                <div className="pp-headline" style={{ fontSize: 14 }}>Feeding · 60 g · 7:30</div>
                <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 2 }}>2 hr ago</div>
              </div>
            </div>
          </MiniPhone>
        </StateFrame>

        {/* Permission denied */}
        <StateFrame label="07 permission · denied">
          <MiniPhone>
            <CenteredState
              icon="ui.bell.slash"
              iconTone="warning"
              title="Permission needed"
              body="To make this work, allow access to notifications in settings."
              primary="Open settings"
              secondary="How to enable"
            />
          </MiniPhone>
        </StateFrame>

        {/* Revoked / expired */}
        <StateFrame label="08 revoked / expired">
          <MiniPhone>
            <CenteredState
              icon="lock.shield"
              title="This access is no longer available"
              body="Contact the owner if you need new access."
              primary="Got it"
            />
          </MiniPhone>
        </StateFrame>
      </div>

      <div style={{ marginTop: 28, padding: 14, background: 'var(--pp-surface-sunken)', borderRadius: 8 }}>
        <div className="pp-headline" style={{ marginBottom: 6 }}>Voice rules applied</div>
        <ul className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', margin: 0, paddingLeft: 18 }}>
          <li>No "you missed" / "you forgot" / "again" / "Warning!" / "Oops!"</li>
          <li>No exclamation marks except in one celebration moment per screen.</li>
          <li>Revoked and expired share one neutral phrasing — never differentiate cause.</li>
          <li>Errors describe what happened in calm language and offer a next action.</li>
        </ul>
      </div>
    </div>
  );
}

Object.assign(window, { StatesFrame });
