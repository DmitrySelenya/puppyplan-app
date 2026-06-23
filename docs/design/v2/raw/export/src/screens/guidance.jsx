// PuppyPlan — Starter Guidance topic detail (DESIGN.md §4.3.3)

function ScreenGuidanceDetail({ topic = 'first-night' }) {
  const topics = {
    'first-night': {
      eyebrow: 'Tip of the day · 1 of 14',
      icon: 'sleep.moon',
      title: 'The first night at home',
      lede: 'A quiet, predictable first night sets the tone for the next ones.',
      sections: [
        {
          h: 'Set up the spot',
          p: 'Place the bed next to yours. Familiar smell from your hand or a worn t-shirt helps. Lower the lights an hour before sleep.',
        },
        {
          h: 'What to expect',
          p: 'Soft whimpering is normal — your puppy is adjusting to a new world. A calm voice is better than picking up. Most puppies settle in 10–20 minutes.',
        },
        {
          h: 'In the morning',
          p: 'Carry the puppy straight outside for a short potty break. Praise quietly the moment it goes outside.',
        },
      ],
      escalation: 'If the puppy is breathing fast and doesn\'t settle, contact your vet clinic.',
    },
  };
  const t = topics[topic];

  return (
    <Phone>
      <SimpleHeader title="" left="Close" right={<Icon name="action.share" size={22} color="var(--pp-text-link)" />} />

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 24px 24px' }}>
        {/* Hero illustration placeholder — gentle striped */}
        <div style={{
          width: '100%', height: 160, borderRadius: 16,
          background: `linear-gradient(180deg, var(--pp-primary-50), var(--pp-surface-sunken))`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, position: 'relative', overflow: 'hidden',
        }}>
          <Icon name={t.icon} size={72} stroke={1.25} color="var(--pp-primary-600)" />
        </div>

        <div className="pp-caption" style={{ color: 'var(--pp-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
          {t.eyebrow}
        </div>
        <div className="pp-display" style={{ fontSize: 30, lineHeight: '34px', marginBottom: 8 }}>{t.title}</div>
        <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginBottom: 24 }}>
          {t.lede}
        </div>

        {t.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div className="pp-title-3" style={{ marginBottom: 6 }}>{s.h}</div>
            <div className="pp-body" style={{ color: 'var(--pp-text-secondary)' }}>{s.p}</div>
          </div>
        ))}

        <div className="pp-divider" style={{ margin: '4px 0 16px' }} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="ui.phone" size={18} color="var(--pp-text-secondary)" stroke={1.75} style={{ marginTop: 2 }} />
          <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', flex: 1, lineHeight: '20px' }}>
            {t.escalation}
          </div>
        </div>

        <div style={{ height: 28 }} />

        <SectionHeader>What worked for you?</SectionHeader>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" style={{ flex: 1 }} leading={<Icon name="ui.book" size={18} />}>Read</Button>
          <Button variant="secondary" style={{ flex: 1 }} leading={<Icon name="ui.checkmark.seal" size={18} />}>Tried it</Button>
          <Button variant="ghost" style={{ flex: 1 }}>Skip</Button>
        </div>

        <div style={{ height: 20 }} />
        <SectionHeader>Up next</SectionHeader>
        <List>
          <ListRow
            leading={<Icon name="potty.outside" size={22} />}
            title="Potty rhythm"
            subtitle="Tip 2 of 14"
            chevron
          />
          <ListRow
            leading={<Icon name="training.paw" size={22} />}
            title="Biting during play"
            subtitle="Tip 3 of 14"
            chevron
          />
        </List>
      </div>
    </Phone>
  );
}

Object.assign(window, { ScreenGuidanceDetail });
