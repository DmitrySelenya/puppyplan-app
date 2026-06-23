// PuppyPlan — Settings detail screens (DESIGN.md §4.4.3, 4.4.4, 4.4.5)

// ──────────────────────────────────────────────────────────
// 14.3 Quick trackers settings — reorderable list, 5 selected cap
// ──────────────────────────────────────────────────────────
function ScreenQuickTrackers() {
  const items = [
    { id: 'feeding',  label: 'Feeding',   icon: 'feeding.bowl',  on: true },
    { id: 'potty',    label: 'Potty',     icon: 'potty.outside', on: true },
    { id: 'sleep',    label: 'Sleep',     icon: 'sleep.moon',    on: true },
    { id: 'walk',     label: 'Walk',      icon: 'feeding.walk',  on: true },
    { id: 'weight',   label: 'Weight',    icon: 'weight',        on: true },
    { id: 'play',     label: 'Play',      icon: 'zoomies.spark', on: false, disabled: true },
    { id: 'training', label: 'Training',  icon: 'training.paw',  on: false, disabled: true },
    { id: 'biting',   label: 'Biting',    icon: 'training.paw',  on: false, disabled: true },
  ];

  return (
    <Phone>
      <SimpleHeader title="Quick trackers" left="More" right="" />
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 24px' }}>
        <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)', marginBottom: 8 }}>
          Choose up to 5 trackers for the Today screen. Drag to reorder.
        </div>
        <div className="pp-subheadline" style={{ color: 'var(--pp-text-tertiary)', marginBottom: 12 }}>
          5 of 5 selected
        </div>

        <List>
          {items.filter(i => i.on).map(it => (
            <ListRow
              key={it.id}
              leading={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon name="drag" size={18} color="var(--pp-text-tertiary)" stroke={1.5} />
                  <Icon name={it.icon} size={22} />
                </div>
              }
              title={it.label}
              trailing={<Toggle on={true} />}
            />
          ))}
        </List>

        <div style={{ height: 20 }} />
        <SectionHeader>More options</SectionHeader>
        <List>
          {items.filter(i => !i.on).map(it => (
            <ListRow
              key={it.id}
              leading={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.5 }}>
                  <Icon name="drag" size={18} color="var(--pp-text-tertiary)" stroke={1.5} />
                  <Icon name={it.icon} size={22} color="var(--pp-text-tertiary)" />
                </div>
              }
              title={<span style={{ color: 'var(--pp-text-tertiary)' }}>{it.label}</span>}
              trailing={<Toggle on={false} />}
            />
          ))}
        </List>

        <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 12, paddingLeft: 4 }}>
          First turn off one of the selected to add another. Turning a tracker off keeps its history — you can re-enable it any time without losing data.
        </div>
      </div>
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 14.4 Notifications — local + push, quiet hours, timezone
// ──────────────────────────────────────────────────────────
function ScreenNotifications() {
  return (
    <Phone>
      <SimpleHeader title="Notifications" left="More" right="" />
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 24px' }}>
        <SectionHeader>Local reminders</SectionHeader>
        <List>
          <ListRow title="All reminders" trailing={<Toggle on={true} />} />
        </List>
        <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', padding: '8px 4px 0' }}>
          They live on this device.
        </div>

        <div style={{ height: 20 }} />
        <SectionHeader>Push to your device</SectionHeader>
        <List>
          <ListRow leading={<Icon name="ui.bell" size={22} />} title="Reminders" trailing={<Toggle on={true} />} />
          <ListRow leading={<Icon name="ui.checkmark.seal" size={22} />} title="Sitter finished a checklist item" trailing={<Toggle on={true} />} />
        </List>
        <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', padding: '8px 4px 0' }}>
          For now, push is sent only for these events. Family activity isn't pushed.
        </div>

        <div style={{ height: 20 }} />
        <SectionHeader>Quiet hours</SectionHeader>
        <List>
          <ListRow
            leading={<Icon name="sleep.moon" size={22} />}
            title="22:00 – 07:00"
            subtitle="No sound, no banner during this window"
            chevron
          />
        </List>

        <div style={{ height: 20 }} />
        <SectionHeader>Time zone</SectionHeader>
        <List>
          <ListRow
            title="Europe / Berlin"
            subtitle="Automatic · matches your device"
            chevron
          />
        </List>
      </div>
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 14.5 Privacy & Account
// ──────────────────────────────────────────────────────────
function ScreenPrivacy() {
  return (
    <Phone>
      <SimpleHeader title="Data and account" left="More" right="" />
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 24px' }}>
        <SectionHeader>Consents</SectionHeader>
        <List>
          <ListRow title="Usage analytics" subtitle="Helps improve the app. Not tied to notification permission." trailing={<Toggle on={true} />} />
          <ListRow title="Crash reports" subtitle="Personal data is removed before sending." trailing={<Toggle on={true} />} />
        </List>

        <div style={{ height: 20 }} />
        <SectionHeader>Your data</SectionHeader>
        <List>
          <ListRow leading={<Icon name="ui.doc.text" size={22} />} title="Export data" subtitle="Timeline, health and reminders as JSON" chevron />
          <ListRow leading={<Icon name="undo" size={22} />} title="Import from backup" chevron />
        </List>

        <div style={{ height: 20 }} />
        <SectionHeader>Account</SectionHeader>
        <List>
          <ListRow leading={<Icon name="person.solo" size={22} />} title="caregiver-a@example.test" subtitle="Apple ID" chevron />
          <ListRow leading={<Icon name="lock.shield" size={22} />} title="Sign out" chevron />
        </List>

        <div style={{ height: 20 }} />
        {/* «Danger zone» → «Account removal» — GitHub jargon didn't fit the calm
           voice (review pass 3, P2). */}
        <SectionHeader>Account removal</SectionHeader>
        <List>
          <ListRow leading={<Icon name="action.delete" size={22} color="var(--pp-danger)" />} title="Delete account" subtitle="Profile, records, and shared links" danger chevron />
        </List>

        <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', textAlign: 'center', marginTop: 20, padding: '0 16px' }}>
          PuppyPlan keeps your data on your device and in your iCloud. Shared links use signed, revocable URLs.
        </div>
      </div>
    </Phone>
  );
}

Object.assign(window, { ScreenQuickTrackers, ScreenNotifications, ScreenPrivacy });
