// PuppyPlan Batch 2 — Pet tab
// Profile and lightweight health context are folded into Pet. No standalone
// No standalone health charts or milestone surfaces in this active batch.

function HealthLine({ icon, title, subtitle, tone, pill }) {
  return (
    <div className="pp-list-row pp-interactive" role="button" tabIndex={0} aria-label={`${title}. ${subtitle}. Tap to manage`} style={{ alignItems: 'flex-start', cursor: 'pointer' }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: tone === 'review' ? 'var(--pp-warning-tint)' : 'var(--pp-primary-50)',
        color: tone === 'review' ? 'var(--pp-warning)' : 'var(--pp-primary-700)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
      }}>
        <Icon name={icon} size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pp-headline">{title}</div>
        <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 2 }}>{subtitle}</div>
      </div>
      {pill}
      <Icon name="chevron.right" size={20} color="var(--pp-text-secondary)" stroke={1.75} style={{ flex: '0 0 auto', alignSelf: 'center' }} />
    </div>
  );
}

function PetMetric({ label, value, sub, icon }) {
  return (
    <div style={{
      flex: 1,
      minHeight: 92,
      borderRadius: 12,
      background: 'var(--pp-surface-raised)',
      border: '1px solid var(--pp-stroke)',
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="pp-caption" style={{ color: 'var(--pp-text-secondary)' }}>{label}</span>
        <Icon name={icon} size={18} color="var(--pp-text-secondary)" />
      </div>
      <div>
        <div className="pp-title-2">{value}</div>
        <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)' }}>{sub}</div>
      </div>
    </div>
  );
}

function PetHero() {
  return (
    <div style={{
      margin: '4px 16px 16px',
      padding: 16,
      borderRadius: 16,
      background: 'linear-gradient(135deg, var(--pp-primary-50), var(--pp-accent-100))',
      border: '1px solid var(--pp-stroke)',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}>
      <Avatar initial="L" size="xl" tone="accent" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pp-title-2">Luna</div>
        <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 2 }}>9 weeks · Border Collie mix</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <Pill tone="confirmed">Profile saved</Pill>
          <Pill tone="template">Puppy stage</Pill>
        </div>
      </div>
      <button
        type="button"
        aria-label="Edit pet profile"
        className="pp-interactive"
        style={{
          width: 44,
          height: 44,
          border: 0,
          borderRadius: 12,
          background: 'var(--pp-surface-raised)',
          color: 'var(--pp-text-link)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="action.edit" size={20} />
      </button>
    </div>
  );
}

function ScreenPetTab() {
  return (
    <Phone>
      <div className="pp-large-title" style={{ paddingTop: 14 }}>Pet</div>
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 96 }}>
        <PetHero />

        <div style={{ display: 'flex', gap: 10, padding: '0 16px 18px' }}>
          <PetMetric label="Current weight" value="4.8 kg" sub="Jun 26" icon="weight" />
          <PetMetric label="Age" value="9 weeks" sub="born Mar 19" icon="ui.info.card" />
        </div>

        <div style={{ padding: '0 16px 18px' }}>
          <Button variant="secondary" block leading={<Icon name="action.add" size={18} />}>Add weight</Button>
        </div>

        <div style={{ padding: '0 16px 18px' }}>
          <SectionHeader action="Add record">Health</SectionHeader>
          <List>
            <HealthLine
              icon="med.vaccine"
              title="Vaccinations"
              subtitle="DHPP booster · Jun 12 · owner record"
              pill={<Pill tone="confirmed">Confirmed</Pill>}
            />
            <HealthLine
              icon="med.deworming"
              title="Parasite treatment"
              subtitle="Template timing · dose not verified"
              pill={<Pill tone="needs-vet-review">Ask your vet</Pill>}
              tone="review"
            />
            <HealthLine
              icon="med.vet_visit"
              title="Vet visits"
              subtitle="No visit recorded yet"
              pill={<Pill tone="template">Template</Pill>}
            />
          </List>
          <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 10, lineHeight: '17px' }}>
            Tap a record to view, edit, or delete entries — or use Add record to log a new one. Confirmed means saved from an owner record; ask your vet before changing care.
          </div>
        </div>

        <div style={{ padding: '0 16px 18px' }}>
          <SectionHeader>Profile</SectionHeader>
          <List>
            <ListRow title="Name" trailing={<span className="pp-callout" style={{ color: 'var(--pp-text-secondary)' }}>Luna</span>} />
            <ListRow title="Breed" trailing={<span className="pp-callout" style={{ color: 'var(--pp-text-secondary)' }}>Border Collie mix</span>} chevron />
            <ListRow title="Sex" trailing={<span className="pp-callout" style={{ color: 'var(--pp-text-secondary)' }}>Female</span>} chevron />
          </List>
        </div>
      </div>
      <TabBar active="pet" />
    </Phone>
  );
}

function LoadingRow({ width = '70%' }) {
  return (
    <div className="pp-list-row">
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--pp-surface-sunken)' }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 12, width, borderRadius: 999, background: 'var(--pp-surface-sunken)' }} />
        <div style={{ height: 10, width: '46%', borderRadius: 999, background: 'var(--pp-surface-sunken)', marginTop: 8 }} />
      </div>
    </div>
  );
}

function ScreenPetStates() {
  return (
    <Phone>
      <SimpleHeader title="Pet states" left="Pet" right="" />
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 96px' }}>
        <SectionHeader>Loading</SectionHeader>
        <List>
          <LoadingRow />
          <LoadingRow width="54%" />
        </List>

        <div style={{ height: 18 }} />
        <SectionHeader>Single weight point</SectionHeader>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="weight" size={24} color="var(--pp-primary-700)" />
            <div style={{ flex: 1 }}>
              <div className="pp-headline">4.8 kg</div>
              <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)' }}>Only one weight logged. Add another to compare.</div>
            </div>
            <Button variant="secondary" size="sm">Add</Button>
          </div>
        </Card>

        <div style={{ height: 18 }} />
        <SectionHeader>No vet visit yet</SectionHeader>
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Icon name="med.vet_visit" size={24} color="var(--pp-text-secondary)" />
            <div style={{ flex: 1 }}>
              <div className="pp-headline">No vet visit recorded</div>
              <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 3 }}>
                Keep appointments here after they happen. Ask your vet about care timing.
              </div>
            </div>
          </div>
        </Card>
      </div>
      <TabBar active="pet" />
    </Phone>
  );
}

Object.assign(window, {
  ScreenPetTab,
  ScreenPetStates,
});
