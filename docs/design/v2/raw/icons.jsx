// PuppyPlan — icon library (linear, 24×24, stroke 1.75 rounded)
// SF Symbols / Material Symbols Outlined visual equivalents drawn as SVG.
// All glyphs use currentColor. No fills (icon.specs: fill 0).

const ICON = {
  // ── Nav ──
  // nav.today — sun glyph. Reads correctly in BOTH tab states: outline (stroke only)
  // and active (filled core + stroked rays). Replaces the old clock glyph, whose
  // filled state rendered as a solid featureless disc (review pass 3, P1).
  'nav.today':   <><circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>,
  'nav.health':  <><path d="M3.5 9.5C3.5 6.7 5.6 4.5 8.4 4.5c1.9 0 3 1 3.6 2 .6-1 1.7-2 3.6-2 2.8 0 4.9 2.2 4.9 5 0 4.7-8.5 9.5-8.5 9.5S3.5 14.2 3.5 9.5z" /></>,
  'nav.more':    <><circle cx="6" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" /></>,

  // ── Actions ──
  'action.quick_log': <><path d="M12 5v14M5 12h14" /></>,
  'action.add':       <><path d="M12 5v14M5 12h14" /></>,
  'action.share':     <><path d="M12 4v12M8 8l4-4 4 4" /><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></>,
  'action.edit':      <><path d="M4 20h4l11-11-4-4L4 16v4z" /><path d="M14 6l4 4" /></>,
  'action.delete':    <><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></>,
  'action.search':    <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>,

  // ── Trackers (potty / feeding / sleep / play / training) ──
  'potty.outside':    <><path d="M12 4c-1.5 4-5 6-5 10a5 5 0 0 0 10 0c0-4-3.5-6-5-10z" /></>,
  'potty.inside':     <><rect x="4" y="6" width="16" height="13" rx="2" /><path d="M9 6V4M15 6V4" /></>,
  'potty.poop':       <><path d="M8 11a3 3 0 0 1 1.5-5.5c.7-1.5 3-1.5 3.5 0a3 3 0 0 1 3 4 3 3 0 0 1 .5 5.5H7a3 3 0 0 1 1-4z" /></>,
  'feeding.bowl':     <><path d="M3 11h18M5 11l1.5 7a2 2 0 0 0 2 1.5h7a2 2 0 0 0 2-1.5L19 11" /><path d="M9 8c0-1.5 1.3-3 3-3s3 1.5 3 3" /></>,
  'feeding.water':    <><path d="M12 3.5C9 7.5 6 11 6 14a6 6 0 0 0 12 0c0-3-3-6.5-6-10.5z" /></>,
  'sleep.moon':       <><path d="M20 14.5A8 8 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" /></>,
  'zoomies.spark':    <><path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.5 6.5l2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 8.5l2-2" /></>,
  'training.paw':     <><circle cx="7" cy="9" r="1.6" /><circle cx="12" cy="6.5" r="1.6" /><circle cx="17" cy="9" r="1.6" /><circle cx="9.5" cy="13" r="1.6" /><circle cx="14.5" cy="13" r="1.6" /><path d="M8 17.5c0-2.2 1.8-3 4-3s4 .8 4 3-1.8 3-4 3-4-.8-4-3z" /></>,
  'household.home':   <><path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8z" /></>,
  'feeding.walk':     <><path d="M9 4v6M9 10l-3 5 3 2v3M9 10l4 1 2 4-3 2" /><circle cx="14" cy="5" r="1.5" /></>,
  'weight':           <><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M12 10v6M9 13h6" /></>,
  'play':             <><circle cx="12" cy="12" r="8" /><path d="M12 4v16M4 12h16" /></>,

  // ── People ──
  'person.solo':      <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></>,
  'person.cluster':   <><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M14 20c0-2.5 1.5-4 4-4s3 1.5 3 3.5" /></>,
  'person.vet':       <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="M16 4l1.5 1.5M14.5 5.5L17 8" /></>,
  'person.trainer':   <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /><circle cx="18" cy="6" r="1.5" /></>,

  // ── Medical ──
  'med.vaccine':      <><path d="M14 4l6 6M16 6l-9 9-3 1 1-3 9-9M11 9l4 4" /></>,
  'med.deworming':    <><path d="M5 18c2-1 2-3 0-4s-2-3 0-4 2-3 0-4M11 18c2-1 2-3 0-4s-2-3 0-4 2-3 0-4M17 18c2-1 2-3 0-4s-2-3 0-4 2-3 0-4" /></>,
  'med.pill':         <><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-30 12 12)" /><path d="M9.5 7.5l5 9" transform="rotate(-30 12 12)" /></>,
  'med.weight':       <><path d="M5 8h14l-1.5 11a2 2 0 0 1-2 1.5h-7a2 2 0 0 1-2-1.5L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  'med.vet_visit':    <><path d="M5 7l7-3 7 3v6c0 4-3 7-7 7s-7-3-7-7V7z" /><path d="M12 9v6M9 12h6" /></>,
  'med.stethoscope':  <><path d="M6 4v6a4 4 0 0 0 8 0V4M10 14v3a4 4 0 0 0 8 0v-2" /><circle cx="18" cy="13" r="2" /></>,

  // ── Status ──
  'status.template':  <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  'status.review':    <><circle cx="12" cy="12" r="8" /><path d="M12 8v5M12 16.5v.01" /></>,
  'status.confirmed': <><circle cx="12" cy="12" r="8" /><path d="M8.5 12.5l2.5 2.5L16 9.5" /></>,
  'status.completed': <><circle cx="12" cy="12" r="8" /><path d="M8.5 12.5l2.5 2.5L16 9.5" /></>,
  'status.urgent_flag': <><path d="M5 21V4l7 2 7-1v9l-7 1-7-2v8" /></>,

  // ── Utility ──
  'chevron.right':    <><path d="M9 6l6 6-6 6" /></>,
  'chevron.down':     <><path d="M6 9l6 6 6-6" /></>,
  'chevron.up':       <><path d="M6 15l6-6 6 6" /></>,
  'chevron.left':     <><path d="M15 6l-6 6 6 6" /></>,
  'close.x':          <><path d="M6 6l12 12M18 6L6 18" /></>,
  'check':            <><path d="M5 12l5 5L19 7" /></>,
  'info.circle':      <><circle cx="12" cy="12" r="8" /><path d="M12 11v5M12 8v.01" /></>,
  'lock.shield':      <><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z" /><rect x="10" y="11" width="4" height="4" rx="1" /></>,

  // ── Extended ──
  'ui.bell':          <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0" /></>,
  'ui.bell.slash':    <><path d="M6 16V11a6 6 0 0 1 9-5.2L6 16zM6 16l-2 2h16l-2-2M10 20a2 2 0 0 0 4 0M4 4l16 16" /></>,
  'ui.wifi.slash':    <><path d="M2 8.5a14 14 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8 15.5a6 6 0 0 1 8 0M12 19v.01M3 3l18 18" /></>,
  'ui.book':          <><path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4V4zM20 4h-3a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h4V4z" /></>,
  'ui.doc.text':      <><path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v4h4M8 11h8M8 15h8M8 19h5" /></>,
  'ui.phone':         <><path d="M5 4h4l2 5-2 1a10 10 0 0 0 5 5l1-2 5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" /></>,
  'ui.gear':          <><circle cx="12" cy="12" r="3" /><path d="M19.5 12a7.5 7.5 0 0 0-.15-1.5l2-1.5-2-3.4-2.4.9a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.35 2.5a7.5 7.5 0 0 0-2.6 1.5l-2.4-.9-2 3.4 2 1.5A7.5 7.5 0 0 0 4.5 12c0 .5.05 1 .15 1.5l-2 1.5 2 3.4 2.4-.9a7.5 7.5 0 0 0 2.6 1.5l.35 2.5h4l.35-2.5a7.5 7.5 0 0 0 2.6-1.5l2.4.9 2-3.4-2-1.5a7.5 7.5 0 0 0 .15-1.5z" /></>,
  'ui.checkmark.seal':<><path d="M12 3l2.5 1.5 3-.5L18 7l2 2-1.5 2.5L19 14l-2 1.5.5 3L14 18l-2 2-2-2-3.5 1 .5-3L5 14l1.5-2.5L5 9l1.5-2.5 3 .5L12 3z" /><path d="M9 12.5l2 2 4-4.5" /></>,
  'ui.checkmark.circle': <><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>,
  'ui.exclamation.circle': <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V13M12 16.5v.01" /></>,
  'ui.info.card':     <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 10h.01M11 10h5M8 14h.01M11 14h5" /></>,
  'ui.paw.filled':    <><circle cx="7" cy="9" r="1.6" /><circle cx="12" cy="6.5" r="1.6" /><circle cx="17" cy="9" r="1.6" /><circle cx="9.5" cy="13" r="1.6" /><circle cx="14.5" cy="13" r="1.6" /><path d="M8 17.5c0-2.2 1.8-3 4-3s4 .8 4 3-1.8 3-4 3-4-.8-4-3z" /></>,
  'arrow.up':         <><path d="M12 5v14M6 11l6-6 6 6" /></>,
  'arrow.right':      <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  'undo':             <><path d="M9 14l-5-4 5-4M4 10h9a6 6 0 0 1 0 12h-3" /></>,
  'more.h':           <><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></>,
  'drag':             <><circle cx="9" cy="6" r="1.2" /><circle cx="15" cy="6" r="1.2" /><circle cx="9" cy="12" r="1.2" /><circle cx="15" cy="12" r="1.2" /><circle cx="9" cy="18" r="1.2" /><circle cx="15" cy="18" r="1.2" /></>,

  // ── Gender (Venus / Mars) ──
  'gender.female':    <><circle cx="12" cy="8.5" r="4.5" /><path d="M12 13v8M8.5 18h7" /></>,
  'gender.male':      <><circle cx="10" cy="14" r="4.5" /><path d="M13.2 10.8L19 5M14.5 5H19v4.5" /></>,
};

function Icon({ name, size = 24, stroke = 1.75, color = 'currentColor', filled = false, style }) {
  const inner = ICON[name];
  if (!inner) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
        <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke={color} strokeWidth={stroke} />
        <text x="12" y="15" textAnchor="middle" fontSize="9" fill={color}>?</text>
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: '0 0 auto', ...style }}
      aria-hidden="true"
    >
      {inner}
    </svg>
  );
}

Object.assign(window, { Icon, ICON });
