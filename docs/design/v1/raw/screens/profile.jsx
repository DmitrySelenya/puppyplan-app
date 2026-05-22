// PuppyPlan — Puppy Profile edit (DESIGN.md §4.4.2)
// Breed picker is the only true picker in the app — implemented as a bottom sheet
// with search, popular-list, and an "I don't know yet" fallback.

const BREEDS = [
  // Most-common first-puppy breeds — alphabetised, plus mix/unknown sentinels.
  { id: 'mix',          name: 'Mix / mutt',         group: 'meta' },
  { id: 'unknown',      name: "Don't know yet",     group: 'meta' },
  { id: 'australian-shepherd', name: 'Australian Shepherd' },
  { id: 'beagle',       name: 'Beagle' },
  { id: 'bernese',      name: 'Bernese Mountain Dog' },
  { id: 'border-collie',name: 'Border Collie' },
  { id: 'boston-terrier',name: 'Boston Terrier' },
  { id: 'boxer',        name: 'Boxer' },
  { id: 'bulldog-french',name: 'Bulldog · French' },
  { id: 'bulldog-eng',  name: 'Bulldog · English' },
  { id: 'cavalier',     name: 'Cavalier King Charles' },
  { id: 'chihuahua',    name: 'Chihuahua' },
  { id: 'cocker',       name: 'Cocker Spaniel' },
  { id: 'corgi-pembroke',name: 'Corgi · Pembroke' },
  { id: 'dachshund',    name: 'Dachshund' },
  { id: 'doberman',     name: 'Doberman' },
  { id: 'german-shep',  name: 'German Shepherd' },
  { id: 'golden',       name: 'Golden Retriever' },
  { id: 'great-dane',   name: 'Great Dane' },
  { id: 'havanese',     name: 'Havanese' },
  { id: 'jack-russell', name: 'Jack Russell Terrier' },
  { id: 'labrador',     name: 'Labrador Retriever' },
  { id: 'maltese',      name: 'Maltese' },
  { id: 'mini-schnauzer',name: 'Miniature Schnauzer' },
  { id: 'pomeranian',   name: 'Pomeranian' },
  { id: 'poodle-mini',  name: 'Poodle · Miniature' },
  { id: 'poodle-std',   name: 'Poodle · Standard' },
  { id: 'pug',          name: 'Pug' },
  { id: 'rottweiler',   name: 'Rottweiler' },
  { id: 'samoyed',      name: 'Samoyed' },
  { id: 'shiba',        name: 'Shiba Inu' },
  { id: 'shih-tzu',     name: 'Shih Tzu' },
  { id: 'siberian',     name: 'Siberian Husky' },
  { id: 'staffy',       name: 'Staffordshire Terrier' },
  { id: 'vizsla',       name: 'Vizsla' },
  { id: 'yorkie',       name: 'Yorkshire Terrier' },
];

// ──────────────────────────────────────────────────────────
// 14.2 Puppy profile · default (already saved, view + edit)
// ──────────────────────────────────────────────────────────
function ScreenProfile({ state = 'default' }) {
  const editing = state === 'editing';
  const picker  = state === 'breed-picker';
  return (
    <Phone>
      <SimpleHeader title="Puppy profile" left={editing ? 'Cancel' : 'More'} right={editing ? 'Save' : 'Edit'} />
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 96px' }}>
        {/* Hero — large avatar + change-photo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 20px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 96, height: 96, borderRadius: 999,
              background: 'var(--pp-accent-100)',
              color: 'var(--pp-accent-700)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, fontWeight: 600, letterSpacing: -1,
              boxShadow: '0 0 0 4px var(--pp-surface-base)',
            }}>L</div>
            <div style={{
              position: 'absolute', right: -2, bottom: -2,
              width: 32, height: 32, borderRadius: 999,
              background: 'var(--pp-surface-raised)',
              border: '1px solid var(--pp-stroke)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="action.edit" size={16} color="var(--pp-text-primary)" stroke={1.75} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <TextLink>Change photo</TextLink>
          </div>
        </div>

        {/* About */}
        <SectionHeader>About</SectionHeader>
        <List>
          <ListRow title="Name" trailing={<span className="pp-callout" style={{ color: 'var(--pp-text-secondary)' }}>Puppy A</span>} />
          <ListRow
            title="Date of birth"
            subtitle="≈ 8 weeks"
            trailing={<span className="pp-callout" style={{ color: 'var(--pp-text-secondary)' }}>Mar 19, 2026</span>}
          />
          <ListRow
            title="Breed"
            trailing={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="pp-callout" style={{ color: 'var(--pp-text-secondary)' }}>Border Collie mix</span>
                <Icon name="chevron.right" size={18} color="var(--pp-text-tertiary)" />
              </div>
            }
            onClick={() => {}}
          />
          <ListRow
            title="Sex"
            trailing={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="pp-callout" style={{ color: 'var(--pp-text-secondary)' }}>Female</span>
                <Icon name="chevron.right" size={18} color="var(--pp-text-tertiary)" />
              </div>
            }
            onClick={() => {}}
          />
        </List>

        <div style={{ height: 20 }} />
        <SectionHeader>Optional</SectionHeader>
        <List>
          <ListRow title="Weight" trailing={<span className="pp-callout" style={{ color: 'var(--pp-text-tertiary)' }}>Add</span>} chevron />
          <ListRow title="Microchip" trailing={<span className="pp-callout" style={{ color: 'var(--pp-text-tertiary)' }}>Add</span>} chevron />
          <ListRow title="Note" subtitle="Allergies, quirks, favourite toy…" chevron />
        </List>

        <div style={{ height: 16 }} />
        <Banner tone="info" icon="lock.shield">
          This data is used inside the app and in the links you create.
        </Banner>
      </div>
      <TabBar active="more" />
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 14.2.b Puppy profile · editing form (open fields)
// ──────────────────────────────────────────────────────────
function ScreenProfileEditing() {
  return (
    <Phone>
      <SimpleHeader title="Puppy profile" left="Cancel" right="Save" />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 96px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0 24px' }}>
          <div style={{
            width: 88, height: 88, borderRadius: 999,
            background: 'var(--pp-accent-100)', color: 'var(--pp-accent-700)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, fontWeight: 600, letterSpacing: -1,
          }}>L</div>
          <div style={{ marginTop: 10 }}>
            <TextLink>Change photo</TextLink>
          </div>
        </div>

        <Field label="Name" value="Puppy A" focused style={{ marginBottom: 16 }} />

        <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 6 }}>Date of birth / approx.</div>
        <Segment options={['Age', 'Date of birth']} value="Date of birth" style={{ marginBottom: 8 }} />
        <Field value="Mar 19, 2026" trailing={<Icon name="ui.info.card" size={18} color="var(--pp-text-tertiary)" />} style={{ marginBottom: 16 }} />

        <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 6 }}>Breed / mix / unknown</div>
        <div className="pp-field" style={{ cursor: 'pointer' }}>
          <div style={{ flex: 1, color: 'var(--pp-text-primary)' }}>Border Collie mix</div>
          <Icon name="chevron.down" size={18} color="var(--pp-text-tertiary)" />
        </div>

        <div style={{ height: 16 }} />
        <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 6 }}>Sex</div>
        <Segment options={['Female', 'Male', 'Unsure']} value="Female" />

        <div style={{ height: 16 }} />
        <Field label="Weight (optional)" placeholder="—" trailing={<span className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)' }}>kg</span>} />

        <div style={{ height: 16 }} />
        <div className="pp-subheadline" style={{ color: 'var(--pp-text-secondary)', marginBottom: 6 }}>Note</div>
        <div className="pp-field" style={{ height: 88, alignItems: 'flex-start', padding: '12px 14px' }}>
          <span style={{ color: 'var(--pp-text-tertiary)' }}>Allergies, quirks, favourite toy…</span>
        </div>

        <div style={{ height: 20 }} />
        <Banner tone="info" icon="lock.shield">
          This data is used inside the app and in the links you create.
        </Banner>
      </div>
    </Phone>
  );
}

// ──────────────────────────────────────────────────────────
// 14.2.c Breed picker — sheet, searchable
// ──────────────────────────────────────────────────────────
function ScreenProfileBreedPicker({ query = '' }) {
  // For the design we render a static, "as if just opened" view with no query —
  // and a second variant where query="bord" filters the list.
  const q = query.toLowerCase().trim();
  const meta    = BREEDS.filter(b => b.group === 'meta');
  const breeds  = BREEDS.filter(b => b.group !== 'meta');
  const matched = q ? breeds.filter(b => b.name.toLowerCase().includes(q)) : breeds;
  const selectedId = q === 'bord' ? 'border-collie' : 'border-collie';

  return (
    <Phone>
      {/* Dimmed background hint of the profile form */}
      <div style={{ position: 'absolute', inset: '47px 0 0 0', background: 'var(--pp-surface-base)', opacity: 0.5 }} />
      <div style={{ position: 'absolute', inset: '47px 0 0 0', background: 'rgba(26,26,24,0.32)' }} />

      {/* Sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: 720,
        background: 'var(--pp-surface-raised)',
        borderRadius: '16px 16px 0 0',
        boxShadow: 'var(--pp-elev-2)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div className="pp-sheet-handle" />

        <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--pp-text-link)', fontSize: 17 }}>Cancel</span>
          <span className="pp-headline">Breed</span>
          <span style={{ color: 'var(--pp-text-link)', fontSize: 17, fontWeight: 600 }}>Done</span>
        </div>

        {/* Search */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{
            background: 'var(--pp-surface-sunken)', borderRadius: 10,
            padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="action.search" size={18} color="var(--pp-text-tertiary)" />
            <span style={{ flex: 1, color: q ? 'var(--pp-text-primary)' : 'var(--pp-text-tertiary)', fontSize: 15 }}>
              {q || 'Search breeds'}
            </span>
            {q && <Icon name="close.x" size={16} color="var(--pp-text-tertiary)" />}
          </div>
          {!q && (
            <div className="pp-footnote" style={{ color: 'var(--pp-text-tertiary)', marginTop: 8 }}>
              Mixes welcome — pick the closest match or "Mix / mutt".
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 24px' }}>
          {!q && (
            <>
              <SectionHeader>Not sure yet?</SectionHeader>
              <List>
                {meta.map(b => (
                  <BreedRow key={b.id} breed={b} selected={selectedId === b.id} />
                ))}
              </List>
              <div style={{ height: 16 }} />
              <SectionHeader>All breeds</SectionHeader>
            </>
          )}
          {q && (
            <SectionHeader>{matched.length} result{matched.length === 1 ? '' : 's'}</SectionHeader>
          )}
          <List>
            {matched.slice(0, q ? matched.length : 14).map(b => (
              <BreedRow key={b.id} breed={b} selected={selectedId === b.id} />
            ))}
          </List>
        </div>
      </div>
    </Phone>
  );
}

function BreedRow({ breed, selected }) {
  return (
    <div className={`pp-list-row${selected ? '' : ' pp-interactive'}`} style={{
      background: selected ? 'var(--pp-primary-50)' : 'var(--pp-surface-raised)',
    }}>
      <div style={{ flex: 1 }}>
        <div className="pp-headline" style={{ color: selected ? 'var(--pp-primary-800)' : 'var(--pp-text-primary)' }}>
          {breed.name}
        </div>
      </div>
      {selected && <Icon name="check" size={20} color="var(--pp-primary-600)" stroke={2.25} />}
    </div>
  );
}

Object.assign(window, {
  ScreenProfile, ScreenProfileEditing, ScreenProfileBreedPicker,
});
