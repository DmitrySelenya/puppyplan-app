// PuppyPlan — Health screens (DESIGN.md §4.1)

function HealthHeader() {
  return (
    <>
      <div className="pp-navbar">
        <span style={{ width: 28 }} />
        <span className="pp-nav-title">Health</span>
        <Icon name="action.add" size={26} color="var(--pp-text-link)" stroke={2} />
      </div>
      <div className="pp-large-title">Health</div>
      <div style={{ padding: '4px 16px 12px' }}>
        <Segment options={['All', 'Vaccinations', 'Treatments', 'Visits']} value="All" />
      </div>
    </>
  );
}

// 11.1 Health list — grouped by month per DESIGN §4.1.1
function ScreenHealthList() {
  // Inline 72pt row with name + status-pill row + meta line, per §4.1.2
  function HealthRow({ icon, iconTone, title, pill, meta, subline }) {
    return (
      <div className="pp-list-row" style={{ minHeight: 72, padding: '14px 16px', alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 auto', paddingTop: 2 }}>
          <Icon name={icon} size={24} color={iconTone || 'var(--pp-text-primary)'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pp-headline" style={{ marginBottom: 4 }}>{title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {pill}
            <span className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)' }}>{meta}</span>
          </div>
          {subline && (
            <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 4 }}>{subline}</div>
          )}
        </div>
        <Icon name="chevron.right" size={20} color="var(--pp-text-tertiary)" stroke={1.75} />
      </div>
    );
  }

  return (
    <Phone>
      <HealthHeader />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 96px' }}>
        <SectionHeader>May 2026</SectionHeader>
        <List>
          <HealthRow
            icon="med.vaccine"
            iconTone="var(--pp-success)"
            title="DHPP vaccine"
            pill={<Pill tone="confirmed">Confirmed</Pill>}
            meta="May 12 · Example Vet Clinic"
          />
          <HealthRow
            icon="med.weight"
            title="Weight check · 4.2 kg"
            pill={<Pill tone="completed">Done</Pill>}
            meta="May 10 · No clinic listed"
          />
          <HealthRow
            icon="med.deworming"
            title="Parasite treatment"
            pill={<Pill tone="needs-review">Ask your vet</Pill>}
            meta="Template"
            subline="Worth discussing with your vet"
          />
          <HealthRow
            icon="med.vaccine"
            title="DHPP, 12 weeks"
            pill={<Pill tone="template">Template</Pill>}
            meta="Suggested"
            subline="Template, not a prescription"
          />
        </List>

        <div style={{ height: 20 }} />
        <SectionHeader>April 2026</SectionHeader>
        <List>
          <HealthRow
            icon="med.vet_visit"
            title="Vet visit — general check"
            pill={<Pill tone="completed">Done</Pill>}
            meta="Apr 28 · Example Vet Clinic"
          />
        </List>

        <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', textAlign: 'center', marginTop: 20 }}>
          This is a record of entries, not medical advice.
        </div>
      </div>
      <TabBar active="health" />
      <FAB />
    </Phone>
  );
}

// 11.2 / 11.3 Health record edit — empty + filled
function ScreenHealthEdit({ filled = false }) {
  return (
    <Phone>
      <SimpleHeader title="New entry" left="Cancel" right="Save" />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 24px' }}>
        <SectionHeader>Main</SectionHeader>
        <Card padding={0}>
          <div style={{ padding: 14 }}>
            <Field label="Name" value={filled ? "DHPP vaccine" : ""} placeholder="Vaccination, treatment, visit…" />
          </div>
          <div className="pp-divider" />
          <div style={{ padding: 14 }}>
            <Field label="Date" value={filled ? "May 14, 2026" : "Today"} trailing={<Icon name="chevron.down" size={18} color="var(--pp-text-tertiary)" />} />
          </div>
          <div className="pp-divider" />
          <div style={{ padding: 14 }}>
            <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 8 }}>Status</div>
            <Segment options={['Template', 'Confirmed', 'Done']} value={filled ? 'Confirmed' : 'Template'} />
          </div>
        </Card>

        <div style={{ height: 20 }} />
        <SectionHeader>More</SectionHeader>
        <Card padding={0}>
          <div style={{ padding: 14 }}>
            <Field label="Clinic or vet (optional)" value={filled ? "Example Vet Clinic" : ""} placeholder="Optional" />
          </div>
          <div className="pp-divider" />
          <div style={{ padding: 14 }}>
            <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 8 }}>Note (optional)</div>
            <div style={{
              minHeight: 80, padding: 12,
              background: 'var(--pp-surface-base)',
              border: '1px solid var(--pp-stroke)', borderRadius: 8,
              color: filled ? 'var(--pp-text-primary)' : 'var(--pp-text-tertiary)',
              fontSize: 15, lineHeight: '22px',
            }}>{filled ? "Example health note for layout only." : "Notes are visible only to you and invited family members."}</div>
            <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 6 }}>Notes aren't used in analytics</div>
          </div>
          <div className="pp-divider" />
          <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="pp-headline">Mark as urgent</div>
              <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 2 }}>Use this if you've already spoken to your vet</div>
            </div>
            <Toggle on={false} />
          </div>
        </Card>

        {filled && (
          <>
            <div style={{ height: 16 }} />
            <Button variant="primary" block>Save</Button>
          </>
        )}
      </div>
    </Phone>
  );
}

// 11.4 Health record — confirmed detail
function ScreenHealthDetail({ pill = 'confirmed' }) {
  return (
    <Phone>
      <SimpleHeader title="Entry" left="Health" right="Edit" />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'var(--pp-success-tint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flex: '0 0 auto',
          }}>
            <Icon name="med.vaccine" size={26} color="var(--pp-success)" />
          </div>
          <div style={{ flex: 1 }}>
            <div className="pp-title-2">DHPP vaccine</div>
            <div className="pp-callout" style={{ color: 'var(--pp-text-tertiary)', marginTop: 2 }}>Vaccination · 12 weeks</div>
            <div style={{ marginTop: 8 }}>
              {pill === 'confirmed' && <Pill tone="confirmed">Confirmed</Pill>}
              {pill === 'review' && <Pill tone="needs-review">Ask your vet</Pill>}
            </div>
          </div>
        </div>

        <div style={{ height: 12 }} />
        <SectionHeader>Details</SectionHeader>
        <Card padding={0}>
          <DetailRow label="Date" value="May 12, 2026" />
          <DetailRow label="Status" value={pill === 'confirmed' ? 'Confirmed' : 'Ask your vet'} />
          <DetailRow label="Clinic" value="Example Vet Clinic" />
          <DetailRow label="Note" value="Example health note for layout only." multiline />
        </Card>

        <div style={{ height: 16 }} />
        <SectionHeader>Stage</SectionHeader>
        <Card>
          <StageStrip stages={['Template', 'Ask your vet', 'Confirmed', 'Done']} current={pill === 'confirmed' ? 2 : 1} />
          <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 12 }}>
            You can change this manually any time
          </div>
        </Card>

        <div style={{ height: 16 }} />
        <SectionHeader>History</SectionHeader>
        <Card>
          <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)' }}>Edited by you · May 12, 2026</div>
        </Card>

        <div style={{ height: 24 }} />
        <Button variant="destructive" block>Delete entry</Button>
      </div>
    </Phone>
  );
}

function DetailRow({ label, value, multiline }) {
  return (
    <>
      <div style={{ padding: 14, display: multiline ? 'block' : 'flex', justifyContent: 'space-between' }}>
        <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginBottom: multiline ? 4 : 0 }}>{label}</div>
        <div className="pp-body" style={{ color: 'var(--pp-text-primary)', textAlign: multiline ? 'left' : 'right' }}>{value}</div>
      </div>
      <div className="pp-divider" />
    </>
  );
}

function StageStrip({ stages, current }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {stages.map((s, i) => {
        const done = i <= current;
        return (
          <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
            <div style={{
              height: 4, width: '100%', borderRadius: 2,
              background: done ? 'var(--pp-primary-500)' : 'var(--pp-surface-sunken)',
            }} />
            <span className="pp-caption" style={{ color: done ? 'var(--pp-primary-700)' : 'var(--pp-text-tertiary)', fontWeight: done ? 600 : 400 }}>{s}</span>
          </div>
        );
      })}
    </div>
  );
}

// 11.6 Health empty — first-run
function ScreenHealthEmpty() {
  return (
    <Phone>
      <HealthHeader />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px 96px', textAlign: 'center' }}>
        <div style={{
          width: 96, height: 96, borderRadius: 16,
          background: `repeating-linear-gradient(135deg, var(--pp-surface-sunken) 0 8px, var(--pp-surface-base) 8px 16px)`,
          border: '1px solid var(--pp-stroke)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <Icon name="med.stethoscope" size={42} stroke={1.5} color="var(--pp-text-tertiary)" />
        </div>
        <div className="pp-title-3" style={{ marginBottom: 8 }}>No entries yet</div>
        <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginBottom: 24, maxWidth: 260 }}>
          Add a first vaccination, treatment, or visit to see the history in one place.
        </div>
        <Button variant="primary">Add entry</Button>
        <div style={{ height: 12 }} />
        <TextLink>Browse templates</TextLink>
      </div>
      <TabBar active="health" />
      <FAB />
    </Phone>
  );
}

Object.assign(window, {
  ScreenHealthList, ScreenHealthEdit, ScreenHealthDetail, ScreenHealthEmpty,
});
