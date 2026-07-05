// PuppyPlan - Batch 2 Diary / Create surfaces.
// English UI copy only. Russian brief terms are mapped to existing English intent.

function Glyph({ d, children, size = 20, color = 'currentColor', stroke = 1.9, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ flex: '0 0 auto', ...style }} aria-hidden="true">
      {children || <path d={d} />}
    </svg>
  );
}

const G = {
  calendar: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  bolt: <><path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" /></>,
  repeat: <><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>,
  note: <><path d="M5 6h14M5 11h14M5 16h9" /></>,
};

function FeedbackNote({ children }) {
  return (
    <div className="pp-caption" style={{ color: 'var(--pp-text-secondary)', marginTop: 6 }}>
      {children}
    </div>
  );
}

function DiaryHeader({ greeting = 'Good morning, Luna', date = 'Thursday, May 14', recap }) {
  return (
    <div style={{ padding: '8px 16px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="pp-title-1">{greeting}</div>
          <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 4 }}>{date}</div>
        </div>
        <Avatar initial="L" size="lg" tone="accent" />
      </div>
      {recap && (
        <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 10 }}>
          {recap}
        </div>
      )}
    </div>
  );
}

function WeekStrip({ selected = 3, today = 3, nums = [11, 12, 13, 14, 15, 16, 17] }) {
  const dows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div role="group" aria-label="Week" style={{ display: 'flex', justifyContent: 'space-between', padding: '0 12px', marginBottom: 18 }}>
      {dows.map((d, i) => {
        const isSelected = i === selected;
        const isToday = i === today;
        return (
          <button
            key={d}
            type="button"
            className="pp-interactive"
            aria-label={`${d} ${nums[i]}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}`}
            style={{
              flex: 1, minWidth: 44, minHeight: 58, border: 0, background: 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
              cursor: 'pointer', fontFamily: 'var(--pp-font)',
            }}
          >
            <span className="pp-caption" style={{ color: isSelected ? 'var(--pp-text-primary)' : 'var(--pp-text-secondary)' }}>{d}</span>
            <span style={{
              width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', borderRadius: 999,
              fontFamily: 'var(--pp-font-display)', fontWeight: 700, fontSize: 16,
              color: isSelected ? 'var(--pp-text-on-primary)' : 'var(--pp-text-primary)',
              background: isSelected ? 'var(--pp-primary-600)' : 'var(--pp-surface-raised)',
              boxShadow: isSelected ? '0 6px 14px rgba(140,80,40,0.30)' : 'var(--pp-elev-1)',
            }}>
              {nums[i]}
              {isToday && !isSelected && <span style={{ position: 'absolute', bottom: -5, width: 5, height: 5, borderRadius: 999, background: 'var(--pp-primary-600)' }} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const DIARY_ACCENTS = {
  clay: { bg: 'var(--pp-primary-50)', fg: 'var(--pp-primary-600)' },
  sage: { bg: 'var(--pp-sage-100)', fg: 'var(--pp-sage-700)' },
  honey: { bg: 'var(--pp-accent-100)', fg: 'var(--pp-accent-700)' },
  mauve: { bg: 'var(--pp-info-tint)', fg: 'var(--pp-info)' },
};

function TimeGutter({ time, quiet }) {
  const [t, mer] = String(time || '').split(' ');
  const col = quiet ? 'var(--pp-text-secondary)' : 'var(--pp-text-secondary)';
  return (
    <div style={{ width: 46, flex: '0 0 auto', textAlign: 'right', paddingRight: 9 }}>
      <div style={{ fontFamily: 'var(--pp-font-display)', fontWeight: 700, fontSize: 13.5, color: col, lineHeight: '16px' }}>{t}</div>
      {mer && <div style={{ fontFamily: 'var(--pp-font)', fontWeight: 700, fontSize: 10, color: col, lineHeight: '12px', marginTop: 1 }}>{mer}</div>}
    </div>
  );
}

function IconChip({ icon, accent = 'clay', quiet }) {
  const a = DIARY_ACCENTS[accent] || DIARY_ACCENTS.clay;
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 13,
      background: quiet ? 'var(--pp-surface-base)' : a.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
    }}>
      <Icon name={icon} size={23} stroke={1.9} color={quiet ? 'var(--pp-text-secondary)' : a.fg} />
    </div>
  );
}

function CheckCircle({ checked, quiet }) {
  return (
    <button
      type="button"
      className="pp-interactive"
      aria-label={checked ? 'Marked done' : 'Mark done'}
      style={{
        width: 44, height: 44, borderRadius: 999, border: 0, background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        flex: '0 0 auto',
      }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: 999,
        border: checked ? 0 : `2px solid ${quiet ? 'var(--pp-stroke-strong)' : 'var(--pp-primary-400)'}`,
        background: checked ? 'var(--pp-sage-500)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <Icon name="check" size={17} stroke={2.6} color="var(--pp-text-on-primary)" />}
      </span>
    </button>
  );
}

function OverflowButton() {
  return (
    <button type="button" className="pp-interactive" aria-label="Routine actions"
      style={{
        width: 44, height: 44, border: 0, background: 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
      <Icon name="more.h" size={22} color="var(--pp-text-secondary)" />
    </button>
  );
}

function RoutineCard({ state = 'upcoming', time, icon, accent = 'clay', title, meta, reminderOff }) {
  const done = state === 'done';
  const past = state === 'past';
  const bg = done ? 'var(--pp-sage-100)' : 'var(--pp-surface-raised)';
  const cardStyle = {
    background: bg,
    boxShadow: past ? 'none' : 'var(--pp-elev-1)',
    opacity: past ? 0.78 : 1,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <TimeGutter time={time} quiet={past} />
      <div
        aria-label={`${title}, ${done ? 'done' : past ? 'was planned' : 'planned'} for ${time}. ${done ? 'Marked.' : 'Not marked.'}`}
        style={{ flex: 1, minWidth: 0, borderRadius: 18, padding: '10px 7px 10px 13px', display: 'flex', alignItems: 'center', gap: 9, ...cardStyle }}
      >
        <CheckCircle checked={done} quiet={past} />
        <IconChip icon={icon} accent={done ? 'sage' : accent} quiet={past} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pp-headline" style={{ color: 'var(--pp-text-primary)' }}>{title}</div>
          {meta && <div className="pp-footnote" style={{ color: 'var(--pp-text-primary)', marginTop: 1 }}>{meta}</div>}
          {reminderOff && (
            <div className="pp-footnote" style={{ color: 'var(--pp-text-primary)', marginTop: 4, display: 'flex', gap: 4, alignItems: 'center' }}>
              <Icon name="ui.bell.slash" size={13} color="var(--pp-text-primary)" /> Notifications off
            </div>
          )}
        </div>
        <OverflowButton />
      </div>
    </div>
  );
}

function FactCard({ time, icon, accent = 'honey', title, caption = 'Spontaneous' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <TimeGutter time={time} />
      <div
        aria-label={`${title}, ${time}, ${caption}`}
        style={{ flex: 1, minWidth: 0, background: 'var(--pp-surface-sunken)', borderRadius: 18, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <IconChip icon={icon} accent={accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pp-headline" style={{ color: 'var(--pp-text-primary)' }}>{title}</div>
          <div className="pp-footnote" style={{ color: 'var(--pp-text-primary)', marginTop: 1 }}>{caption}</div>
        </div>
      </div>
    </div>
  );
}

function InfoHero() {
  return (
    <div style={{ background: 'var(--pp-info-tint)', borderRadius: 20, padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
      <Icon name="info.circle" size={24} color="var(--pp-info)" />
      <div className="pp-callout" style={{ color: 'var(--pp-text-primary)' }}>
        Puppies around 9 weeks sleep 18-20 hours. Frequent naps are normal.
      </div>
    </div>
  );
}

function DayDivider({ label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
      <span className="pp-title-3">{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--pp-stroke)' }} />
      {sub && <span className="pp-footnote" style={{ color: 'var(--pp-text-secondary)' }}>{sub}</span>}
    </div>
  );
}

function ScreenDiaryDay() {
  return (
    <Phone>
      <DiaryHeader recap="Since yesterday: last sleep at 9:30 pm, walk at 10:00 pm." />
      <WeekStrip />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 120px' }}>
        <InfoHero />
        <div className="pp-title-3" style={{ padding: '0 0 12px' }}>Today</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <RoutineCard state="done" time="7:15 am" icon="feeding.walk" title="Walk" meta="20 min" />
          <RoutineCard state="upcoming" time="7:30 am" icon="feeding.bowl" title="Feeding" meta="60 g" />
          <RoutineCard state="past" time="1:00 pm" accent="mauve" icon="sleep.moon" title="Nap" meta="2 hr" reminderOff />
          <FactCard time="2:32 pm" accent="honey" icon="tracker.ball" title="Play" caption="Logged · 10 min" />
          <RoutineCard state="upcoming" time="6:00 pm" icon="feeding.bowl" title="Feeding" meta="60 g" />
        </div>
      </div>
      <TabBar active="diary" />
    </Phone>
  );
}

function ScreenDiaryPast() {
  return (
    <Phone>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 10px' }}>
        <div className="pp-title-3">Diary</div>
        <Avatar initial="L" size="md" tone="accent" />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 16px 120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--pp-text-secondary)', marginBottom: 2 }}>
          <Icon name="chevron.up" size={16} stroke={2} color="var(--pp-text-secondary)" />
          <span className="pp-footnote" style={{ fontWeight: 700 }}>Today · 5 events</span>
        </div>
        <DayDivider label="Yesterday" sub="Wed, May 13" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <RoutineCard state="done" time="6:05 pm" icon="feeding.bowl" title="Feeding" meta="60 g" />
          <FactCard time="4:40 pm" icon="tracker.ball" title="Play" caption="Logged · 12 min" />
        </div>
        <DayDivider label="Tuesday, May 12" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <RoutineCard state="past" time="8:10 am" icon="feeding.walk" title="Walk" meta="25 min" />
          <FactCard time="10:10 pm" accent="mauve" icon="sleep.moon" title="Sleep" caption="Logged · 7 hr" />
        </div>
      </div>
      <TabBar active="diary" />
    </Phone>
  );
}

function EmptyIllustration({ icon = 'training.paw' }) {
  return (
    <div style={{ width: 96, height: 96, borderRadius: 999, background: 'var(--pp-primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
      <Icon name={icon} size={46} stroke={1.5} color="var(--pp-primary-500)" />
    </div>
  );
}

function ScreenDiaryColdStart() {
  return (
    <Phone>
      <DiaryHeader greeting="Welcome home, Luna" date="First day" />
      <WeekStrip />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '44px 28px 120px' }}>
        <EmptyIllustration />
        <div className="pp-title-3">Start with the first thing that happens</div>
        <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)', marginTop: 8, maxWidth: 280 }}>
          No setup marathon. Log now, then add a gentle routine when you are ready.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 22, width: '100%' }}>
          <Button variant="primary" block>Quick Log</Button>
          <Button variant="secondary" block>Add to schedule</Button>
        </div>
      </div>
      <TabBar active="diary" />
    </Phone>
  );
}

function StarterAction({ icon, title, subtitle, primary }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minHeight: primary ? 72 : 56,
      padding: primary ? '12px 14px' : '8px 12px',
      borderRadius: primary ? 18 : 14,
      background: primary ? 'var(--pp-primary-600)' : 'var(--pp-surface-raised)',
      border: `1px solid ${primary ? 'var(--pp-primary-200)' : 'var(--pp-stroke)'}`,
      boxShadow: primary ? 'var(--pp-elev-1)' : 'none',
    }}>
      <div style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        background: primary ? 'rgba(255,247,239,0.18)' : 'var(--pp-surface-sunken)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: primary ? 'var(--pp-text-on-primary)' : 'var(--pp-text-secondary)',
      }}>
        <Icon name={icon} size={22} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pp-headline" style={{ color: primary ? 'var(--pp-text-on-primary)' : 'var(--pp-text-primary)' }}>{title}</div>
        <div className="pp-footnote" style={{ color: primary ? 'rgba(255,247,239,0.82)' : 'var(--pp-text-secondary)', marginTop: 2 }}>{subtitle}</div>
      </div>
      <Icon name="chevron.right" size={19} color={primary ? 'var(--pp-text-on-primary)' : 'var(--pp-text-secondary)'} />
    </div>
  );
}

function ScreenDiaryFirstRun() {
  return (
    <Phone>
      <DiaryHeader greeting="Welcome home, Luna" date="First day" recap="Your Diary starts empty. Start with one useful record." />
      <div style={{ flex: 1, overflow: 'auto', padding: '2px 16px 120px' }}>
        <div style={{ background: 'var(--pp-surface-raised)', border: '1px solid var(--pp-stroke)', borderRadius: 18, padding: 14, marginBottom: 12 }}>
          <Pill tone="info">First session</Pill>
          <div className="pp-title-3" style={{ marginTop: 8 }}>Make one useful record</div>
          <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 5, lineHeight: '18px' }}>
            Log what is happening now. You can build the first routine after the first record lands.
          </div>
        </div>

        <SectionHeader>Best first step</SectionHeader>
        <div style={{ display: 'grid', gap: 8 }}>
          <StarterAction icon="feeding.bowl" title="Log now" subtitle="Fastest first record" primary />
        </div>

        <div style={{ height: 16 }} />
        <SectionHeader>Useful next</SectionHeader>
        <div style={{ display: 'grid', gap: 8 }}>
          <StarterAction icon="ui.bell" title="Create first routine" subtitle="Breakfast, potty, sleep, or walk" />
          <StarterAction icon="potty.outside" title="Log potty" subtitle="Useful during the first day" />
        </div>
      </div>
      <TabBar active="diary" />
    </Phone>
  );
}

function HistoryFilterBar() {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
      {['All', 'Food', 'Potty', 'Sleep'].map((label, i) => (
        <button key={label} type="button" className="pp-interactive" aria-pressed={i === 0} style={{
          minHeight: 44,
          padding: '0 14px',
          borderRadius: 999,
          border: `1px solid ${i === 0 ? 'var(--pp-primary-300)' : 'var(--pp-stroke)'}`,
          background: i === 0 ? 'var(--pp-primary-50)' : 'var(--pp-surface-raised)',
          color: i === 0 ? 'var(--pp-primary-700)' : 'var(--pp-text-secondary)',
          fontFamily: 'var(--pp-font)',
          fontWeight: 700,
          cursor: 'pointer',
        }}>{label}</button>
      ))}
    </div>
  );
}

function HistoryEvent({ time, icon, title, subtitle, actor, tone = 'clay' }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <TimeGutter time={time} />
      <div style={{
        flex: 1,
        minWidth: 0,
        background: 'var(--pp-surface-raised)',
        border: '1px solid var(--pp-stroke)',
        borderRadius: 16,
        padding: '12px 12px',
        display: 'flex',
        gap: 11,
        alignItems: 'center',
      }}>
        <IconChip icon={icon} accent={tone} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pp-headline">{title}</div>
          <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 2 }}>{subtitle}</div>
        </div>
        {actor && <Pill tone="template">{actor}</Pill>}
      </div>
    </div>
  );
}

function ScreenDiaryHistory() {
  return (
    <Phone>
      <div className="pp-navbar">
        <span style={{ width: 44 }} />
        <span className="pp-nav-title">Diary</span>
        <Avatar initial="L" size="sm" tone="accent" />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 96px' }}>
        <Banner tone="info" icon="info.circle">Scrolled history state inside Diary. No Timeline route.</Banner>
        <div style={{ height: 12 }} />
        <HistoryFilterBar />
        <DayDivider label="Today" sub="5 events" />
        <div style={{ display: 'grid', gap: 10 }}>
          <HistoryEvent time="7:15 am" icon="feeding.walk" title="Walk" subtitle="20 min" actor="You" />
          <HistoryEvent time="7:30 am" icon="feeding.bowl" title="Feeding" subtitle="60 g" actor="Olya" tone="sage" />
          <HistoryEvent time="2:32 pm" icon="tracker.ball" title="Play" subtitle="10 min" actor="You" tone="honey" />
        </div>
        <DayDivider label="Yesterday" sub="4 events" />
        <div style={{ display: 'grid', gap: 10 }}>
          <HistoryEvent time="6:05 pm" icon="feeding.bowl" title="Feeding" subtitle="60 g" actor="Olya" />
          <HistoryEvent time="4:40 pm" icon="tracker.ball" title="Play" subtitle="12 min" actor="You" tone="honey" />
        </div>
      </div>
      <TabBar active="diary" />
    </Phone>
  );
}

function ScreenDiaryEmpty() {
  return (
    <Phone>
      <DiaryHeader greeting="Saturday" date="May 16" />
      <WeekStrip selected={5} today={3} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '86px 36px 120px' }}>
        <EmptyIllustration />
        <div className="pp-title-3">No logs for this day yet</div>
        <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)', marginTop: 8, maxWidth: 260 }}>
          Add the first event with the plus button when something happens.
        </div>
      </div>
      <TabBar active="diary" />
    </Phone>
  );
}

function ScreenDiaryAllDone() {
  return (
    <Phone>
      <DiaryHeader greeting="Good evening, Luna" date="Thursday, May 14" />
      <WeekStrip />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 120px' }}>
        <div style={{ background: 'var(--pp-sage-100)', borderRadius: 22, padding: 18, marginBottom: 18 }}>
          <Pill tone="success">All routines checked</Pill>
          <div className="pp-title-3" style={{ marginTop: 10 }}>A steady day</div>
          <div className="pp-callout" style={{ color: 'var(--pp-text-primary)', marginTop: 6 }}>
            Luna's plan is complete. The diary stays here whenever you need it.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <RoutineCard state="done" time="7:15 am" icon="feeding.walk" title="Walk" meta="20 min" />
          <RoutineCard state="done" time="7:30 am" icon="feeding.bowl" title="Feeding" meta="60 g" />
          <FactCard time="2:32 pm" icon="tracker.ball" title="Play" caption="Logged · 10 min" />
          <RoutineCard state="done" time="6:00 pm" icon="feeding.bowl" title="Feeding" meta="60 g" />
        </div>
      </div>
      <TabBar active="diary" />
    </Phone>
  );
}

function ScreenDiaryStates() {
  return (
    <Phone>
      <div className="pp-navbar"><span style={{ width: 28 }} /><span className="pp-nav-title">Diary states</span><span style={{ width: 28 }} /></div>
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 16px 120px' }}>
        <SectionHeader>Loading</SectionHeader>
        <Card>
          <Skel w="52%" h={22} />
          <div style={{ height: 14 }} />
          <Skel w="100%" h={72} r={18} />
          <div style={{ height: 10 }} />
          <Skel w="82%" h={72} r={18} />
        </Card>
        <div style={{ height: 16 }} />
        <SectionHeader>Offline</SectionHeader>
        <Banner tone="info" icon="ui.wifi.slash">Offline - showing saved data.</Banner>
        <div style={{ height: 16 }} />
        <SectionHeader>Pending write</SectionHeader>
        <FactCard time="now" icon="feeding.bowl" title="Feeding" caption="Saving..." />
      </div>
      <TabBar active="diary" />
    </Phone>
  );
}

function ScreenWeekSelectedDifferent() {
  return (
    <Phone>
      <DiaryHeader greeting="Tuesday" date="May 12" />
      <WeekStrip selected={1} today={3} />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 120px' }}>
        <Banner tone="info" icon="info.circle">Today is marked with a dot. Tuesday is selected.</Banner>
        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px 0 14px' }}>
          <button type="button" className="pp-interactive" style={{
            minHeight: 44,
            border: '1px solid var(--pp-primary-200)',
            background: 'var(--pp-primary-50)',
            color: 'var(--pp-primary-700)',
            borderRadius: 999,
            padding: '0 14px',
            fontFamily: 'var(--pp-font)',
            fontWeight: 800,
          }}>Back to today</button>
        </div>
        <DayDivider label="Tuesday, May 12" />
        <FactCard time="8:10 am" icon="feeding.walk" title="Walk" caption="Logged · 25 min" />
      </div>
      <TabBar active="diary" />
    </Phone>
  );
}

function ChooserSlab({ glyph, glyphBg, title, sub }) {
  return (
    <div role="button" tabIndex={0} className="pp-interactive" style={{ background: 'var(--pp-surface-raised)', borderRadius: 20, boxShadow: '0 12px 30px rgba(40,28,16,0.26)', padding: 18, display: 'flex', gap: 14, alignItems: 'center', minHeight: 76, cursor: 'pointer' }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: glyphBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{glyph}</div>
      <div style={{ flex: 1 }}>
        <div className="pp-title-3">{title}</div>
        <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 2 }}>{sub}</div>
      </div>
      <Icon name="chevron.right" size={20} color="var(--pp-stroke-strong)" stroke={2} />
    </div>
  );
}

function QuickLogMiniTile({ icon, label, selected }) {
  return (
    <div style={{
      minHeight: 42,
      borderRadius: 12,
      background: selected ? 'var(--pp-primary-50)' : 'var(--pp-surface-sunken)',
      border: `1px solid ${selected ? 'var(--pp-primary-200)' : 'transparent'}`,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 10px',
      color: selected ? 'var(--pp-primary-700)' : 'var(--pp-text-primary)',
      fontWeight: 750,
      fontSize: 12,
    }}>
      <Icon name={icon} size={18} />
      <span>{label}</span>
    </div>
  );
}

function QuickLogContractPreview() {
  return (
    <div style={{
      background: 'var(--pp-surface-raised)',
      border: '1px solid var(--pp-stroke)',
      borderRadius: 18,
      padding: 12,
      boxShadow: 'var(--pp-elev-1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
        <div>
          <div className="pp-headline">Quick Log sheet</div>
          <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)' }}>After tapping Quick Log</div>
        </div>
        <Pill tone="pending">Pending row</Pill>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <QuickLogMiniTile icon="feeding.bowl" label="Feeding" selected />
        <QuickLogMiniTile icon="potty.outside" label="Potty" />
      </div>
      <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 9, lineHeight: '16px' }}>
        SaveSuccess inserts a Diary row. Duplicate warning shows recent household logs; failed save exposes Retry/Delete.
      </div>
    </div>
  );
}

function ScreenAddChooser() {
  return (
    <Phone>
      <div style={{ position: 'absolute', inset: '0', opacity: 0.55 }}>
        <DiaryHeader />
        <WeekStrip />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--pp-surface-scrim)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 102, padding: '0 16px' }}>
        <div style={{ width: 38, height: 5, borderRadius: 999, background: 'rgba(255,247,239,0.85)', margin: '0 auto 12px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ChooserSlab glyph={<Glyph size={26} color="var(--pp-primary-600)">{G.bolt}</Glyph>} glyphBg="var(--pp-primary-50)" title="Quick Log" sub="Log what already happened" />
          <ChooserSlab glyph={<Glyph size={26} color="var(--pp-info)">{G.calendar}</Glyph>} glyphBg="var(--pp-info-tint)" title="Add to schedule" sub="A routine or one-time reminder" />
        </div>
      </div>
      <TabBar active="diary" addOpen />
    </Phone>
  );
}

function RepeatPill({ children, on }) {
  return (
    <button type="button" className="pp-interactive" aria-pressed={!!on} style={{
      minHeight: 44, padding: '0 14px', borderRadius: 999, border: 0, cursor: 'pointer',
      fontFamily: 'var(--pp-font)', fontWeight: 700, fontSize: 13,
      color: on ? 'var(--pp-text-on-primary)' : 'var(--pp-text-primary)',
      background: on ? 'var(--pp-primary-600)' : 'var(--pp-surface-sunken)',
    }}>{children}</button>
  );
}

function NativeTimeRow({ platform = 'Device', time = '7:30 am' }) {
  return (
    <button type="button" className="pp-interactive" aria-label={`Time, ${time}`} style={{
      width: '100%',
      minHeight: 64,
      border: '1px solid var(--pp-stroke)',
      borderRadius: 16,
      background: 'var(--pp-surface-raised)',
      padding: '10px 13px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      cursor: 'pointer',
      fontFamily: 'var(--pp-font)',
      textAlign: 'left',
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--pp-info-tint)', color: 'var(--pp-info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="ui.clock" size={22} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pp-headline">{time}</div>
        <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 2 }}>{platform} native picker</div>
      </div>
      <Icon name="chevron.right" size={20} color="var(--pp-text-secondary)" />
    </button>
  );
}

function AdvancedRow({ title, value, chevron }) {
  return (
    <ListRow
      title={title}
      subtitle={value}
      chevron={chevron}
      style={{ minHeight: 58 }}
    />
  );
}

function ScheduleContent() {
  const tiles = [
    ['feeding.bowl', 'Feeding'],
    ['potty.outside', 'Potty'],
    ['sleep.moon', 'Sleep'],
    ['feeding.walk', 'Walk'],
    ['tracker.ball', 'Play'],
    ['zoomies.spark', 'Zoomies'],
  ];
  return (
    <>
      <SimpleHeader title="Add to schedule" left="Cancel" right="Save" />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 24px' }}>
        <Banner tone="info" icon="info.circle">Save enables after event + time. Dirty cancel asks to discard.</Banner>
        <div style={{ height: 12 }} />
        <SectionHeader>Event</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {tiles.map(([icon, label], i) => (
            <TrackerTile key={label} icon={icon} label={label} selected={i === 0} size="three-col" style={{ height: 88 }} />
          ))}
        </div>
        <div style={{ height: 16 }} />
        <SectionHeader>Time</SectionHeader>
        <NativeTimeRow />
        <FeedbackNote>Save flow: routine saves first, then permission primer, OS prompt, and success or denied state.</FeedbackNote>
        <div style={{ height: 16 }} />
        <SectionHeader>Repeat</SectionHeader>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <RepeatPill>Never</RepeatPill>
          <RepeatPill on>Every day</RepeatPill>
          <RepeatPill>Weekdays</RepeatPill>
        </div>
        <div style={{ height: 16 }} />
        <SectionHeader>Details</SectionHeader>
        <List>
          <AdvancedRow title="Amount" value="60 g" chevron />
          <AdvancedRow title="Note" value="Optional" chevron />
        </List>
        <FeedbackNote>Error state: keep the form open, show inline error, preserve user input.</FeedbackNote>
      </div>
    </>
  );
}

function ScreenSchedule() {
  return (
    <Phone>
      <ScheduleContent />
    </Phone>
  );
}

function IOSWheelColumn({ values, active }) {
  return (
    <div style={{ flex: 1, height: 150, overflow: 'hidden', position: 'relative', display: 'grid', placeItems: 'center' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 56, height: 38, borderTop: '1px solid rgba(0,0,0,0.08)', borderBottom: '1px solid rgba(0,0,0,0.08)' }} />
      <div style={{ display: 'grid', gap: 8, textAlign: 'center' }}>
        {values.map((v) => (
          <div key={v} style={{
            fontSize: v === active ? 28 : 20,
            lineHeight: v === active ? '34px' : '26px',
            fontWeight: v === active ? 700 : 500,
            color: v === active ? 'var(--pp-text-primary)' : 'var(--pp-text-secondary)',
          }}>{v}</div>
        ))}
      </div>
    </div>
  );
}

function ScreenNativeTimePickerIOS() {
  return (
    <Phone>
      <ScheduleContent />
      <div style={{ position: 'absolute', inset: 0, background: 'var(--pp-surface-scrim)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--pp-surface-raised)', borderRadius: '24px 24px 0 0', padding: '0 16px 30px', boxShadow: 'var(--pp-elev-2)' }}>
        <div className="pp-sheet-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: 8 }}>
          <NavbarAction align="left">Cancel</NavbarAction>
          <div className="pp-headline">Start time</div>
          <NavbarAction align="right" bold>Done</NavbarAction>
        </div>
        <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', textAlign: 'center', marginBottom: 8 }}>
          iOS uses the system DatePicker wheel in a sheet.
        </div>
        <div style={{ height: 170, borderRadius: 18, background: 'var(--pp-surface-sunken)', display: 'flex', padding: '10px 12px' }}>
          <IOSWheelColumn values={['6', '7', '8']} active="7" />
          <IOSWheelColumn values={['20', '30', '40']} active="30" />
          <IOSWheelColumn values={['AM', 'PM']} active="AM" />
        </div>
      </div>
    </Phone>
  );
}

function ClockNumber({ n, x, y, active }) {
  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 38,
      height: 38,
      borderRadius: 999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: active ? 'var(--pp-primary-600)' : 'transparent',
      color: active ? 'var(--pp-text-on-primary)' : 'var(--pp-text-primary)',
      fontWeight: active ? 800 : 700,
      fontSize: 15,
    }}>{n}</div>
  );
}

function AndroidClockFace() {
  const points = [
    ['12', 101, 10], ['1', 146, 22], ['2', 179, 55], ['3', 191, 101],
    ['4', 179, 146], ['5', 146, 179], ['6', 101, 191], ['7', 55, 179],
    ['8', 22, 146], ['9', 10, 101], ['10', 22, 55], ['11', 55, 22],
  ];
  return (
    <div style={{ width: 240, height: 240, borderRadius: 999, background: 'var(--pp-surface-sunken)', position: 'relative', margin: '10px auto 16px' }}>
      <div style={{ position: 'absolute', left: 119, top: 119, width: 2, height: 70, background: 'var(--pp-primary-600)', transformOrigin: 'top center', transform: 'rotate(225deg)' }} />
      <div style={{ position: 'absolute', left: 113, top: 113, width: 14, height: 14, borderRadius: 999, background: 'var(--pp-primary-600)' }} />
      {points.map(([n, x, y]) => <ClockNumber key={n} n={n} x={x} y={y} active={n === '7'} />)}
    </div>
  );
}

function ScreenNativeTimePickerAndroid() {
  return (
    <Phone>
      <ScheduleContent />
      <div style={{ position: 'absolute', inset: 0, background: 'var(--pp-surface-scrim)' }} />
      <div style={{ position: 'absolute', left: 18, right: 18, top: 120, background: 'var(--pp-surface-raised)', borderRadius: 24, padding: 20, boxShadow: 'var(--pp-elev-3)' }}>
        <div className="pp-caption" style={{ color: 'var(--pp-text-secondary)', marginBottom: 10 }}>SELECT TIME</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
          <div className="pp-display" style={{ background: 'var(--pp-primary-50)', color: 'var(--pp-primary-700)', borderRadius: 14, padding: '8px 14px' }}>7</div>
          <div className="pp-display">:</div>
          <div className="pp-display" style={{ background: 'var(--pp-surface-sunken)', borderRadius: 14, padding: '8px 14px' }}>30</div>
          <div style={{ display: 'grid', gap: 6 }}>
            <Pill tone="confirmed">AM</Pill>
            <Pill tone="template">PM</Pill>
          </div>
        </div>
        <AndroidClockFace />
        <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', textAlign: 'center', marginBottom: 14 }}>
          Android opens the Material TimePicker dialog.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 18 }}>
          <TextLink>Cancel</TextLink>
          <TextLink>OK</TextLink>
        </div>
      </div>
    </Phone>
  );
}

function ComponentSpecCell({ title, children }) {
  return (
    <div style={{ background: 'var(--pp-surface-raised)', border: '1px solid var(--pp-stroke)', borderRadius: 14, padding: 14, minHeight: 118 }}>
      <div className="pp-caption" style={{ color: 'var(--pp-text-secondary)', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function ScreenComponentContracts() {
  return (
    <div style={{ width: 820, minHeight: 840, padding: 28, background: 'var(--pp-surface-base)', color: 'var(--pp-text-primary)', fontFamily: 'var(--pp-font)' }}>
      <div className="pp-caption" style={{ color: 'var(--pp-primary-700)', marginBottom: 8 }}>BATCH 3 COMPONENT CONTRACTS</div>
      <div className="pp-display" style={{ fontSize: 32, lineHeight: '38px', marginBottom: 8 }}>Native-first controls and scalable rows</div>
      <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', maxWidth: 620, marginBottom: 22 }}>
        These are implementation contracts for the next native pass. App code must use platform controls and design primitives, not custom universal controls.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <ComponentSpecCell title="TimePicker">
          <NativeTimeRow platform="iOS or Android" />
          <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 8 }}>Use platform-native controls, not a custom universal wheel. iOS: time-only DatePicker wheel in sheet, Cancel/Done, locale and 24h aware. Android: Material TimePicker dialog, Cancel/OK.</div>
        </ComponentSpecCell>
        <ComponentSpecCell title="TabBar + Add">
          <div style={{ position: 'relative', height: 76 }}>
            <TabBar active="diary" />
          </div>
          <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 8 }}>Add is independent, 16-20pt from capsule. Focus order: Diary, Pet, More, Add. AX sizes may drop visible labels; accessibilityLabel keeps names.</div>
        </ComponentSpecCell>
        <ComponentSpecCell title="StatusPill">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Pill tone="confirmed">Confirmed</Pill>
            <Pill tone="template">Template</Pill>
            <Pill tone="needs-vet-review">Ask your vet</Pill>
          </div>
          <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 8 }}>Never color-only: icon plus label. Small pill text uses contrast-safe foreground on tinted fills.</div>
        </ComponentSpecCell>
        <ComponentSpecCell title="ListRow">
          <List>
            <ListRow leading={<Icon name="ui.bell" size={22} />} title="Breakfast" subtitle="Next today at 7:30 am" chevron />
          </List>
          <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 8 }}>Rows grow vertically. Subtitle wraps; accessory stays visible and center/top-safe.</div>
        </ComponentSpecCell>
        <ComponentSpecCell title="TrackerTile">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            <TrackerTile icon="feeding.bowl" label="Feeding" selected size="three-col" style={{ width: '100%', height: 88 }} />
            <TrackerTile icon="potty.outside" label="Potty" size="three-col" style={{ width: '100%', height: 88 }} />
          </div>
          <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 8 }}>Quick Log grid uses these tiles. SaveSuccess inserts a pending Diary row; duplicate warning and failed save expose local actions.</div>
        </ComponentSpecCell>
        <ComponentSpecCell title="Dynamic Type Risk">
          <div className="pp-title-3">Long translated headings wrap to two lines</div>
          <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)', marginTop: 6 }}>Rows grow vertically; controls stay visible.</div>
        </ComponentSpecCell>
        <ComponentSpecCell title="Routine lifecycle">
          <div className="pp-title-3">Paused routines live in More</div>
          <div className="pp-callout" style={{ color: 'var(--pp-text-secondary)', marginTop: 6 }}>Paused routines do not show in Diary; row tap opens edit/lifecycle, direct Resume restarts Diary visibility.</div>
        </ComponentSpecCell>
        <ComponentSpecCell title="Feedback + motion">
          <div className="pp-callout" style={{ color: 'var(--pp-text-primary)' }}>Add: selection + sheet. Quick Log save: saveSuccess + fade. Check-off: tapConfirm + sage fade. Delete: warning + snackbar undo.</div>
          <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 8 }}>Every animation has Reduced Motion fallback; no new haptic tokens.</div>
        </ComponentSpecCell>
        <ComponentSpecCell title="Form states">
          <div className="pp-callout" style={{ color: 'var(--pp-text-primary)' }}>Save disabled until valid, spinner while saving, inline error on failure, dirty dismiss confirmation, primer after first save.</div>
          <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 8 }}>Sequence: Save routine -> permission primer -> OS prompt -> success or denied.</div>
        </ComponentSpecCell>
      </div>
    </div>
  );
}

function ScreenPermissionPrimer({ denied = false }) {
  return (
    <Phone>
      <div style={{ flex: 1, background: 'rgba(40,30,22,0.34)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--pp-surface-raised)', borderRadius: '24px 24px 0 0', padding: '0 20px 34px', boxShadow: 'var(--pp-elev-2)' }}>
        <div className="pp-sheet-handle" />
        <div style={{ width: 58, height: 58, borderRadius: 18, background: denied ? 'var(--pp-warning-tint)' : 'var(--pp-info-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon name={denied ? 'ui.bell.slash' : 'ui.bell'} size={30} color={denied ? 'var(--pp-warning)' : 'var(--pp-info)'} />
        </div>
        <div className="pp-title-2">{denied ? 'Notifications are off' : 'Remind you?'}</div>
        <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginTop: 8, marginBottom: 20 }}>
          {denied ? 'The routine was saved, but reminders are silent. You can turn notifications on in Settings.' : 'To make routines work, allow notifications. Only what you schedule - no spam.'}
        </div>
        {denied ? (
          <>
            <Button variant="primary" block>Open Settings</Button>
            <div className="pp-footnote" style={{ color: 'var(--pp-text-secondary)', marginTop: 10, textAlign: 'center' }}>
              On return, re-check permission and keep the routine saved either way.
            </div>
          </>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <Button variant="primary" block>Allow</Button>
            <Button variant="secondary" block>Not now</Button>
          </div>
        )}
      </div>
    </Phone>
  );
}

function ScreenFirstRoutineSuccess() {
  return (
    <Phone>
      <div style={{ flex: 1, background: 'rgba(40,30,22,0.34)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--pp-surface-raised)', borderRadius: '24px 24px 0 0', padding: '0 20px 34px', boxShadow: 'var(--pp-elev-2)' }}>
        <div className="pp-sheet-handle" />
        <div style={{ width: 58, height: 58, borderRadius: 18, background: 'var(--pp-accent-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon name="ui.checkmark.seal" size={30} color="var(--pp-accent-700)" />
        </div>
        <div className="pp-title-2">Done</div>
        <div className="pp-body" style={{ color: 'var(--pp-text-secondary)', marginTop: 8, marginBottom: 20 }}>
          Manage routines in More -> Routines and reminders.
        </div>
        <Button variant="primary" block>Got it</Button>
      </div>
    </Phone>
  );
}

function ScreenRoutineMenu() {
  return (
    <Phone>
      <DiaryHeader />
      <WeekStrip />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 120px' }}>
        <RoutineCard state="past" time="1:00 pm" accent="mauve" icon="sleep.moon" title="Nap" meta="2 hr" />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--pp-surface-scrim)' }} />
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 126, display: 'grid', gap: 10 }}>
        <Card padding={0}>
          <ListRow leading={<Icon name="check" size={22} />} title="Mark done" subtitle="Back-date to planned time" />
          <ListRow leading={<Icon name="close.x" size={22} />} title="Skip" subtitle="Dismiss quietly" />
        </Card>
        <Card padding={0}>
          <ListRow leading={<Icon name="action.edit" size={22} />} title="Edit routine" />
          <ListRow leading={<Icon name="ui.bell.slash" size={22} />} title="Pause" />
          <ListRow leading={<Icon name="action.delete" size={22} color="var(--pp-danger)" />} title="Delete" subtitle="Diary entries stay" danger />
        </Card>
      </div>
      <TabBar active="diary" />
    </Phone>
  );
}

function ScreenPausedRoutineRecovery() {
  return (
    <Phone>
      <DiaryHeader />
      <WeekStrip />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 120px' }}>
        <Banner tone="info" icon="info.circle">Evening feeding is paused. It will not show in Diary until resumed.</Banner>
        <DayDivider label="Today" sub="2 routines" />
        <RoutineCard time="7:30" mer="AM" icon="feeding.bowl" title="Breakfast" meta="Every day" />
        <RoutineCard time="10:00" mer="AM" icon="potty.outside" title="Outside break" meta="Weekdays" />
      </div>
      <Snackbar action="Undo" secondary="Open More" style={{ bottom: 108 }}>Evening feeding paused</Snackbar>
      <TabBar active="diary" />
    </Phone>
  );
}

function ScreenFirstDiaryAfterOnboarding() {
  return <ScreenDiaryFirstRun />;
}

Object.assign(window, {
  ScreenDiaryDay,
  ScreenDiaryPast,
  ScreenDiaryFirstRun,
  ScreenDiaryHistory,
  ScreenDiaryColdStart,
  ScreenDiaryEmpty,
  ScreenDiaryAllDone,
  ScreenDiaryStates,
  ScreenWeekSelectedDifferent,
  ScreenAddChooser,
  ScreenSchedule,
  ScreenNativeTimePickerIOS,
  ScreenNativeTimePickerAndroid,
  ScreenComponentContracts,
  ScreenPermissionPrimer,
  ScreenFirstRoutineSuccess,
  ScreenRoutineMenu,
  ScreenPausedRoutineRecovery,
  ScreenFirstDiaryAfterOnboarding,
});
