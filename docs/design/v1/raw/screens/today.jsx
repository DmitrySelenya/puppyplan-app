// PuppyPlan — Today screens (DESIGN.md §2.2)

// ──────────────────────────────────────────────────────────
// Shared Today scaffolding
// ──────────────────────────────────────────────────────────
function TodayHeader({ name = 'Puppy A', age = '8 weeks', members }) {
  return (
    <>
      <div className="pp-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar initial="L" size="md" tone="accent" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="pp-headline" style={{ lineHeight: '20px' }}>{name}</span>
            <span className="pp-caption" style={{ color: 'var(--pp-text-tertiary)' }}>{age}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {members && <AvatarCluster initials={members} />}
          <Icon name="ui.bell" size={24} color="var(--pp-text-primary)" />
        </div>
      </div>
      <div className="pp-large-title">Today</div>
      <div className="pp-callout" style={{ padding: '0 16px 12px', color: 'var(--pp-text-tertiary)' }}>
        Thursday · May 14
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────
// 3.1 Today — day 1 (first run)
// ──────────────────────────────────────────────────────────
function ScreenTodayDay1() {
  return (
    <Phone>
      <TodayHeader />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 96px' }}>
        <HeroCard
          eyebrow="START"
          title="Log your first event — it takes about five seconds."
          primary="Start"
        />
        <div style={{ height: 20 }} />

        <SectionHeader>What to do now</SectionHeader>
        <List>
          <ListRow leading={<Icon name="feeding.bowl" size={22} />} title="Watch the feeding pattern" chevron />
          <ListRow leading={<Icon name="potty.outside" size={22} />} title="Short potty breaks every 1–2 hours" chevron />
          <ListRow leading={<Icon name="sleep.moon" size={22} />} title="A quiet spot for sleep" chevron />
        </List>

        <div style={{ height: 20 }} />
        <Banner tone="info" icon="ui.book">The first day is about observing, not results.</Banner>
      </div>
      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 3.2 Today — day 2 morning, post-first-log
// ──────────────────────────────────────────────────────────
function ScreenTodayDay2() {
  return (
    <Phone>
      <TodayHeader />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 96px' }}>
        <HeroCard
          eyebrow="NOW"
          title="Morning potty break"
          body="Puppy A slept 6 hours — bladder is full."
          primary="Log potty break"
          tertiary="Later"
        />
        <div style={{ height: 20 }} />

        <SectionHeader>What we learned yesterday</SectionHeader>
        <Card>
          <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)' }}>
            3 walks outside, 2 feedings. A gentle rhythm for day two.
          </div>
        </Card>

        <div style={{ height: 20 }} />
        <SectionHeader>Reminders</SectionHeader>
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Icon name="ui.bell" size={20} color="var(--pp-text-secondary)" />
            <div style={{ flex: 1 }}>
              <div className="pp-headline">Feeding · <span className="pp-tabular-num">7:30 am</span></div>
              <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 2 }}>A gentle start to the day</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <Button variant="primary" leading={<Icon name="check" size={16} stroke={2.5} color="#fff" />} style={{ flex: 1, minHeight: 40, padding: '8px 16px', fontSize: 15 }}>Done</Button>
                <button
                  type="button"
                  aria-label="More actions"
                  className="pp-interactive"
                  style={{
                    width: 40, height: 40, borderRadius: 8,
                    background: 'var(--pp-surface-sunken)', border: 0, padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flex: '0 0 auto',
                  }}
                >
                  <Icon name="more.h" size={20} color="var(--pp-text-secondary)" />
                </button>
              </div>
              <div className="pp-caption" style={{ color: 'var(--pp-text-tertiary)', marginTop: 8 }}>Snooze · Skip · Edit · Stop in the menu</div>
            </div>
          </div>
        </Card>
      </div>
      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

function PillButton({ children }) {
  return (
    <span style={{
      padding: '7px 12px',
      borderRadius: 8,
      background: 'var(--pp-surface-sunken)',
      color: 'var(--pp-text-primary)',
      fontSize: 14,
      fontWeight: 600,
    }}>{children}</span>
  );
}

// ──────────────────────────────────────────────────────────
// 3.3 Today — day 7 weekly rhythm
// ──────────────────────────────────────────────────────────
function ScreenTodayDay7() {
  return (
    <Phone>
      <TodayHeader name="Puppy A" age="9 weeks" />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 96px' }}>
        <HeroCard
          eyebrow="NOW"
          title="Looks like it's time for a break."
          body="Last break was 1 hr 40 min ago."
          primary="Log it"
          tertiary="Later"
        />
        <div style={{ height: 20 }} />

        <SectionHeader>Feeding on the usual rhythm</SectionHeader>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="feeding.bowl" size={26} color="var(--pp-text-secondary)" />
            <div style={{ flex: 1 }}>
              <div className="pp-headline">About <span className="pp-tabular-num">60 g</span> · <span className="pp-tabular-num">7:30 am</span></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Button variant="secondary" style={{ flex: 1 }}>Usual portion</Button>
            <Button variant="ghost">Change</Button>
          </div>
        </Card>

        <div style={{ height: 20 }} />
        <SectionHeader>Weekly rhythm</SectionHeader>
        <Card>
          <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)', marginBottom: 12 }}>Over 7 days:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <WeeklyRow label="Walks outside" value="21" />
            <WeeklyRow label="Feedings" value="14" />
            <WeeklyRow label="Sleep — average" value="18 hr / day" />
          </div>
          <div className="pp-divider" style={{ margin: '14px 0' }} />
          <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)' }}>
            <span style={{ color: 'var(--pp-text-tertiary)' }}>Clearer now: </span>
            Puppy A usually asks to go out 40–60 minutes after a meal.
          </div>
          <div style={{ marginTop: 12 }}>
            <TextLink>See details</TextLink>
          </div>
        </Card>
      </div>
      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

function WeeklyRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span className="pp-callout" style={{ color: 'var(--pp-text-secondary)' }}>{label}</span>
      <span className="pp-headline pp-mono" style={{ color: 'var(--pp-text-primary)' }}>{value}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 3.4 Today — with activity strip populated
// ──────────────────────────────────────────────────────────
function ScreenTodayWithActivity() {
  return (
    <Phone>
      <TodayHeader members={['O', 'D']} />
      <div style={{ padding: '0 16px 12px' }}>
        <ActivityStrip>
          Caregiver A fed Puppy A · 42 min ago
        </ActivityStrip>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 96px' }}>
        <HeroCard
          eyebrow="NOW"
          title="Looks like it's time for a break."
          body="Last break was 1 hr 40 min ago."
          primary="Log it"
          tertiary="Later"
        />
        <div style={{ height: 20 }} />

        <SectionHeader>Now</SectionHeader>
        <List>
          <ListRow
            leading={<Avatar initial="O" size="md" />}
            title="Caregiver A logged a potty break"
            subtitle="Pee outside · 4 min ago"
            chevron
          />
          <ListRow
            leading={<Avatar initial="D" size="md" tone="sunken" />}
            title="Caregiver B got back from a walk"
            subtitle="1 hr ago"
            chevron
          />
        </List>

        <div style={{ height: 20 }} />
        <SectionHeader>Next</SectionHeader>
        <Card>
          <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)' }}>With you: Caregiver A, Caregiver B, you.</div>
        </Card>
      </div>
      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 3.5 Loading skeleton
// ──────────────────────────────────────────────────────────
function ScreenTodayLoading() {
  return (
    <Phone>
      <TodayHeader />
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 16px 96px' }}>
        <Card>
          <Skel w="70%" h={20} />
          <div style={{ height: 8 }} />
          <Skel w="90%" h={14} />
          <div style={{ height: 6 }} />
          <Skel w="60%" h={14} />
          <div style={{ height: 16 }} />
          <Skel w="100%" h={44} r={8} />
        </Card>
        <div style={{ height: 20 }} />
        <Skel w="40%" h={12} style={{ marginBottom: 8 }} />
        <Card style={{ padding: 0 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ padding: 14, borderTop: i > 1 ? '1px solid var(--pp-stroke)' : 0, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Skel w={28} h={28} r={14} />
              <div style={{ flex: 1 }}>
                <Skel w="60%" h={14} />
                <div style={{ height: 6 }} />
                <Skel w="40%" h={11} />
              </div>
            </div>
          ))}
        </Card>
      </div>
      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 3.6 Offline-read
// ──────────────────────────────────────────────────────────
function ScreenTodayOffline() {
  return (
    <Phone>
      <TodayHeader />
      <div style={{ padding: '0 16px 12px' }}>
        <Banner tone="offline" icon="ui.wifi.slash">Showing your last saved data.</Banner>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 96px' }}>
        <HeroCard
          eyebrow="NOW"
          title="Looks like it's time for a break."
          body="Last break was 1 hr 40 min ago."
          primary="Log it"
          tertiary="Later"
        />
        <div style={{ height: 20 }} />
        <List>
          <ListRow leading={<Icon name="feeding.bowl" size={22} />} title="Feeding · 60 g" subtitle="7:30 · synced earlier today" meta="2 hr ago" />
          <ListRow leading={<Icon name="potty.outside" size={22} />} title="Pee outside" subtitle="6:08 · synced earlier today" meta="3 hr ago" />
        </List>
        <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', textAlign: 'center', marginTop: 16 }}>
          Last sync: 9:31. Your changes will be saved locally.
        </div>
      </div>
      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 3.7 Pending-write
// ──────────────────────────────────────────────────────────
function ScreenTodayPending() {
  return (
    <Phone>
      <TodayHeader />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 96px' }}>
        <HeroCard
          eyebrow="NOW"
          title="Looks like it's time for a break."
          body="Last break was 1 hr 40 min ago."
          primary="Log it"
          tertiary="Later"
        />
        <div style={{ height: 20 }} />
        <SectionHeader>Now</SectionHeader>
        <List>
          <ListRow
            leading={<Icon name="potty.outside" size={22} />}
            title="Pee outside · 9:42"
            subtitle="just now"
            trailing={<Pill tone="pending">Saving</Pill>}
          />
          <ListRow
            leading={<Icon name="feeding.bowl" size={22} />}
            title="Feeding · 60 g · 7:30"
            meta="2 hr ago"
          />
        </List>
      </div>
      <TabBar active="today" />
      <FAB />
    </Phone>
  );
}

Object.assign(window, {
  ScreenTodayDay1, ScreenTodayDay2, ScreenTodayDay7,
  ScreenTodayWithActivity, ScreenTodayLoading, ScreenTodayOffline, ScreenTodayPending,
});
