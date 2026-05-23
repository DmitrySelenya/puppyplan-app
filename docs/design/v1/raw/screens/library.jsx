// PuppyPlan — Section 1: Foundation / Component Library
// One large sheet showing the design system primitives with token references.

function LibraryRow({ title, anno, children, dense }) {
  return (
    <div style={{ paddingBottom: dense ? 16 : 24, marginBottom: dense ? 16 : 24, borderBottom: '1px dashed var(--pp-stroke)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="pp-headline">{title}</div>
        <div className="pp-anno">{anno}</div>
      </div>
      {children}
    </div>
  );
}

function ColorSwatch({ name, hex, value, dark }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 110 }}>
      <div style={{
        width: '100%', height: 64, borderRadius: 8,
        background: value || hex,
        border: '1px solid var(--pp-stroke)',
      }} />
      <div>
        <div className="pp-caption" style={{ fontWeight: 600, color: dark ? '#fff' : 'var(--pp-text-primary)' }}>{name}</div>
        <div className="pp-anno">{hex}</div>
      </div>
    </div>
  );
}

function LibraryFrame() {
  return (
    <div className="pp-app" style={{
      width: 920, padding: 32,
      background: 'var(--pp-surface-base)',
      color: 'var(--pp-text-primary)',
      fontFamily: 'var(--pp-font)',
      border: '1px solid var(--pp-stroke)',
      borderRadius: 12,
    }}>
      <div className="pp-display" style={{ fontSize: 32, lineHeight: '38px', marginBottom: 4 }}>Foundation</div>
      <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginBottom: 32, maxWidth: 540 }}>
        Tokens, components, and patterns. Every value below maps to a token in <code style={{ fontFamily: 'var(--pp-font-mono)', fontSize: 14 }}>design-tokens.json</code>. Use these — do not invent new values.
      </div>

      {/* COLOR */}
      <LibraryRow title="Surface" anno="color.surface.*">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <ColorSwatch name="base" hex="#FBFAF7" />
          <ColorSwatch name="raised" hex="#FFFFFF" />
          <ColorSwatch name="sunken" hex="#F1ECE3" />
          <ColorSwatch name="scrim 32%" hex="rgba(26,26,24,0.32)" value="rgba(26,26,24,0.32)" />
        </div>
      </LibraryRow>

      <LibraryRow title="Text" anno="color.text.*">
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <div><div className="pp-body" style={{ color: 'var(--pp-text-primary)' }}>Primary 14.8:1</div><div className="pp-anno">#1C1F1B</div></div>
          <div><div className="pp-body" style={{ color: 'var(--pp-text-secondary)' }}>Secondary 8.6:1</div><div className="pp-anno">#4A4E48</div></div>
          <div><div className="pp-body" style={{ color: 'var(--pp-text-tertiary)' }}>Tertiary 4.50:1</div><div className="pp-anno">#72756A</div></div>
          <div><div className="pp-body" style={{ color: 'var(--pp-text-link)' }}>Link 5.0:1</div><div className="pp-anno">#0E7490</div></div>
        </div>
      </LibraryRow>

      <LibraryRow title="Primary — Calm Teal" anno="color.primary.50–800">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['50','100','200','300','400','500','600','700','800'].map(k => (
            <ColorSwatch key={k} name={k} hex={`primary/${k}`} value={`var(--pp-primary-${k})`} />
          ))}
        </div>
      </LibraryRow>

      <LibraryRow title="Accent — Ember Coral · celebration only" anno="color.accent.* — never default CTA">
        <div style={{ display: 'flex', gap: 8 }}>
          {[['100','#FBEBE0'],['300','#F4B89A'],['500','#E07A4F'],['700','#A14B26']].map(([k, h]) => (
            <ColorSwatch key={k} name={`accent ${k}`} hex={h} value={h} />
          ))}
        </div>
      </LibraryRow>

      <LibraryRow title="Status — muted only · danger user-marked only" anno="color.status.*">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ColorSwatch name="success" hex="#3F7A57" value="#3F7A57" />
          <ColorSwatch name="warning" hex="#A06A1F" value="#A06A1F" />
          <ColorSwatch name="danger" hex="#9A3B2E" value="#9A3B2E" />
          <ColorSwatch name="info" hex="#3C5C7A" value="#3C5C7A" />
        </div>
      </LibraryRow>

      {/* TYPE */}
      <LibraryRow title="Type scale" anno="SF Pro Text / Roboto · tabular numerals">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="pp-display">Display 34/41 · 600</div>
          <div className="pp-title-1">Title 1 · 28/34 · 600</div>
          <div className="pp-title-2">Title 2 · 22/28 · 600</div>
          <div className="pp-title-3">Title 3 · 20/25 · 600</div>
          <div className="pp-headline">Headline · 17/22 · 600</div>
          <div className="pp-body">Body · 17/24 · 400 — minimum readable text size at 16pt</div>
          <div className="pp-callout">Callout · 16/22 · 400</div>
          <div className="pp-subheadline">Subheadline · 15/20 · 400</div>
          <div className="pp-footnote">Footnote · 13/18 · 400</div>
          <div className="pp-caption">Caption · 12/16 · 400</div>
          <div className="pp-callout pp-mono">Mono · 15/20 · for dosage, IDs</div>
        </div>
      </LibraryRow>

      {/* SPACE / RADIUS */}
      <LibraryRow title="Spacing · 4pt grid" anno="space/0…14">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          {[
            ['1', 4], ['2', 8], ['3', 12], ['4', 16], ['5', 20], ['6', 24], ['8', 32], ['10', 40], ['14', 56],
          ].map(([k, px]) => (
            <div key={k} style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: px, background: 'var(--pp-primary-200)', borderRadius: 4 }} />
              <div className="pp-anno" style={{ marginTop: 6 }}>s-{k} · {px}pt</div>
            </div>
          ))}
        </div>
      </LibraryRow>

      <LibraryRow title="Radius" anno="radius.{sm,md,lg,full}">
        <div style={{ display: 'flex', gap: 16 }}>
          {[['sm', 8], ['md', 12], ['lg', 16], ['full', 999]].map(([k, r]) => (
            <div key={k} style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: r, background: 'var(--pp-primary-100)', border: '1px solid var(--pp-primary-300)' }} />
              <div className="pp-anno" style={{ marginTop: 6 }}>{k} · {r === 999 ? '999' : `${r}pt`}</div>
            </div>
          ))}
        </div>
      </LibraryRow>

      <LibraryRow title="Elevation" anno="elev/0…3 — neutral grey only, no glow">
        <div style={{ display: 'flex', gap: 16 }}>
          {[['elev/0 hairline', 'var(--pp-elev-0)'], ['elev/1 interactive', 'var(--pp-elev-1)'], ['elev/2 sheet', '0 4px 16px rgba(28,31,27,0.10), 0 0 0 1px var(--pp-stroke)'], ['elev/3 modal', 'var(--pp-elev-3), 0 0 0 1px var(--pp-stroke)']].map(([k, v]) => (
            <div key={k} style={{ textAlign: 'center' }}>
              <div style={{ width: 92, height: 56, background: '#fff', borderRadius: 12, boxShadow: v }} />
              <div className="pp-anno" style={{ marginTop: 6 }}>{k}</div>
            </div>
          ))}
        </div>
      </LibraryRow>

      {/* BUTTONS */}
      <LibraryRow title="Button — radius/sm · min 44pt" anno="primary/600 fill on default · accent never default">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="primary">Continue</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="ghost">Later</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </LibraryRow>

      {/* PILLS */}
      <LibraryRow title="Status pills · icon + text + color (never color alone)" anno="component.pill · h 24pt">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill tone="template">Template</Pill>
          <Pill tone="needs-review">Ask your vet</Pill>
          <Pill tone="confirmed">Confirmed</Pill>
          <Pill tone="completed">Done</Pill>
          <Pill tone="pending">Saving</Pill>
          <Pill tone="failed">Not saved</Pill>
          <Pill tone="urgent">Urgent — user-marked</Pill>
        </div>
      </LibraryRow>

      {/* FIELDS */}
      <LibraryRow title="Form fields" anno="radius/sm · min 44pt · focus ring 2pt + 2pt offset">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 560 }}>
          <Field label="Name (default)" value="Puppy A" />
          <Field label="Name (focused)" value="Lun" focused />
          <Field label="Date (error)" value="2027-06-04" error="That date is in the future — please double-check" />
          <Field label="Empty" placeholder="Optional" />
        </div>
      </LibraryRow>

      {/* TILES */}
      <LibraryRow title="Tracker tile" anno="2-col 168×96 · 3-col 110×96 · icon 28pt">
        <div style={{ display: 'flex', gap: 12 }}>
          <TrackerTile icon="potty.outside" label="Pee outside" size="two-col" selected />
          <TrackerTile icon="feeding.bowl" label="Feeding" size="two-col" />
          <TrackerTile icon="sleep.moon" label="Sleep" size="two-col" pending />
        </div>
      </LibraryRow>

      {/* CARDS */}
      <LibraryRow title="Card / Hero card" anno="surface/raised · radius/md · elev/0 hairline">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 560 }}>
          <Card>
            <div className="pp-headline">List card</div>
            <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 4 }}>Hairline · 1px stroke/default</div>
          </Card>
          <Card style={{ background: 'var(--pp-accent-100)', borderColor: 'transparent' }}>
            <div className="pp-headline" style={{ color: 'var(--pp-accent-700)' }}>Celebration card</div>
            <div className="pp-footnote" style={{ color: 'var(--pp-accent-700)', marginTop: 4 }}>Tint · accent/100 · never default</div>
          </Card>
        </div>
      </LibraryRow>

      {/* LIST */}
      <LibraryRow title="List item · min-height 56pt" anno="component.list-item">
        <div style={{ maxWidth: 380 }}>
          <List>
            <ListRow leading={<Icon name="potty.outside" size={22} />} title="Pee outside" subtitle="9:42 · After sleep" trailing={<Pill tone="confirmed">Confirmed</Pill>} chevron />
            <ListRow leading={<Avatar initial="O" />} title="Caregiver A" subtitle="Caregiver · active 4 min ago" chevron />
          </List>
        </div>
      </LibraryRow>

      {/* SNACK */}
      <LibraryRow title="Snackbar · 4s default / 6s with action" anno="elev/1 · radius/md">
        <div style={{ maxWidth: 380 }}>
          <Snackbar action="Undo" secondary="Add details">Logged · Pee outside</Snackbar>
        </div>
      </LibraryRow>

      {/* BANNERS */}
      <LibraryRow title="Inline alert · info / warning / urgent / offline" anno="never bright red">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
          <Banner tone="info">Notes are visible only to you and invited family members.</Banner>
          <Banner tone="warning">Notifications are off. Reminder will be saved silent.</Banner>
          <Banner tone="failed">A few events didn't save. Check your connection.</Banner>
          <Banner tone="offline">You're offline. Your changes will be saved locally.</Banner>
        </div>
      </LibraryRow>

      {/* FAB + TABBAR */}
      <LibraryRow title="Tab bar · FAB · Activity strip" anno="3 tabs / Quick Log FAB 56pt · primary/600">
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: 280 }}>
            <div className="pp-tabbar" style={{ borderRadius: 12, border: '1px solid var(--pp-stroke)' }}>
              {[
                ['Today', 'nav.today', true],
                ['Health', 'nav.health', false],
                ['More', 'nav.more', false],
              ].map(([l, i, a]) => (
                <div key={l} className={`pp-tab ${a ? 'is-active' : ''}`}>
                  <Icon name={i} size={26} filled={a} />
                  <span>{l}</span>
                </div>
              ))}
            </div>
            <div className="pp-anno" style={{ marginTop: 8 }}>height 49pt + bottom inset</div>
          </div>
          <div>
            <div style={{
              width: 56, height: 56, borderRadius: 999,
              background: 'var(--pp-primary-600)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(28,31,27,0.18)',
            }}>
              <Icon name="action.quick_log" size={28} stroke={2.25} color="#fff" />
            </div>
            <div className="pp-anno" style={{ marginTop: 8 }}>FAB · 56pt · primary/600</div>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <ActivityStrip>Caregiver A fed Puppy A · 42 min ago</ActivityStrip>
            <div className="pp-anno" style={{ marginTop: 8 }}>Activity strip · household attribution</div>
          </div>
        </div>
      </LibraryRow>

      {/* AVATARS */}
      <LibraryRow title="Avatar · single / cluster" anno="32/40/56pt · initial + tonal bg">
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Avatar initial="L" size="md" />
          <Avatar initial="O" size="lg" tone="sunken" />
          <Avatar initial="D" size="xl" tone="accent" />
          <AvatarCluster initials={['O', 'D', 'Y']} size="lg" />
        </div>
      </LibraryRow>

      {/* ICONS */}
      <LibraryRow title="Icon set · 24pt · stroke 1.75 · rounded caps" anno="icon.core-mvp + icon.utility + icon.extended">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12 }}>
          {[
            'nav.today','nav.health','nav.more',
            'action.quick_log','action.add','action.share','action.edit','action.delete','action.search',
            'potty.outside','potty.inside','potty.poop',
            'feeding.bowl','feeding.water','feeding.walk','sleep.moon',
            'zoomies.spark','training.paw','household.home',
            'person.solo','person.cluster','person.vet','person.trainer',
            'med.vaccine','med.deworming','med.pill','med.weight','med.vet_visit',
            'status.template','status.review','status.confirmed','status.completed','status.urgent_flag',
            'chevron.right','chevron.down','close.x','check','info.circle','lock.shield',
            'ui.bell','ui.bell.slash','ui.wifi.slash','ui.book','ui.doc.text','ui.phone','ui.gear',
            'ui.checkmark.seal','ui.checkmark.circle','ui.exclamation.circle',
          ].map(n => (
            <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 8,
                border: '1px solid var(--pp-stroke)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--pp-surface-raised)',
              }}>
                <Icon name={n} size={24} />
              </div>
              <div className="pp-anno" style={{ textAlign: 'center', fontSize: 9, lineHeight: 1.2 }}>{n}</div>
            </div>
          ))}
        </div>
      </LibraryRow>

      {/* CONTRACTS */}
      <div style={{ marginTop: 8 }}>
        <div className="pp-headline" style={{ marginBottom: 10 }}>Hard contracts</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            ['Tabs', 'exactly 3 — Today / Health / More'],
            ['Quick Log', 'persistent FAB · never a tab'],
            ['Hero CTA', 'one primary + ≤1 tertiary link · never two equal-weight filled'],
            ['Quick Log sheet', '≤5 trackers visible'],
            ['Today cards', '≤5 daily cards · rest behind Show more'],
            ['Accent (coral)', 'celebration only — first log, milestone, vaccine confirmed'],
            ['Danger (clay red)', 'user-marked urgent only · never system-flagged'],
            ['No streaks · no shame copy · no missed-days · no exclamation (except 1 celebration)', ''],
            ['Tap targets', '≥44pt · Quick Log buttons 56–64pt · FAB 56pt'],
            ['Native only', 'SF Pro (iOS) / Roboto (Android) · no web fonts'],
          ].map(([k, v], i) => (
            <div key={i} style={{ padding: 12, background: 'var(--pp-surface-sunken)', borderRadius: 8 }}>
              <div className="pp-headline" style={{ fontSize: 14 }}>{k}</div>
              {v && <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 4 }}>{v}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LibraryFrame });
