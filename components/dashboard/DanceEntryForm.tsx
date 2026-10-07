import { CSSProperties, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { CompetitionWithPricing } from "@/lib/queries/competitionsWithPricing";
import { hexToRgbParts } from "@/lib/hexToRgbParts";
import { DanceEntryInput, uploadDanceMusic } from "@/lib/queries/registrations";
import { supabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Registration } from "@/types/registration";
import { StudioManager } from "@/types/studioManager";
import { getCompetitionDayOptions, getMusicSubmissionCutoffIso } from "@/lib/getCompetitionDays";
import {
  DANCE_LEVELS,
  DANCE_STYLES,
  STEP_DIVISIONS,
  categoryFromParticipantCount,
  computePrice,
  computeRecordingFeeForType,
  computeSurcharge,
  computeTotalPrice,
  displayCategoryLabel,
  formatDateHe,
  formatPrice,
  isEarlyPricing,
} from "@/lib/pricing";
import {
  CameraIcon,
  ChevronDownIcon,
  DancerIcon,
  MinusIcon,
  PersonIcon,
  PlusIcon,
  UploadIcon,
  VideoCameraIcon,
} from "./icons";
import styles from "./DanceEntryForm.module.css";

type Props = {
  studioManagerId: string;
  manager: StudioManager;
  competition: CompetitionWithPricing;
  entries: Registration[];
  editingEntry: Registration | null;
  onSubmit: (entry: DanceEntryInput, existingId?: string) => Promise<void>;
  onClose: () => void;
  // Reports live whether the form currently holds data that would be lost
  // if it were torn down right now (switching competitions, navigating to
  // step 2, etc. all unmount this component, wiping its local state with
  // nothing saved) — see Step2FinalRegistration, which uses this to block
  // navigating away from step 1 until she confirms.
  onDirtyChange?: (dirty: boolean) => void;
};

const OTHER_STYLE = "אחר";

// Eilat's two competitions don't split registration by day the way every
// other multi-day competition does — per Dani (2026-10-03), the day
// question simply isn't relevant there, regardless of how many calendar
// days the competition's `date` field happens to span.
const NO_DAY_SELECTION_SLUGS = new Set(["eilat-dance-international", "super-star-eilat"]);

// A numbered badge in front of each step's title — matches the accordion
// below it (only one step open at a time; see `openStep`), 1→3.
// A <span>, not a <p>: this renders inside StepCardHead's <button>, and
// <button>'s content model only allows phrasing (inline) content — a <p> is
// flow content, so browsers were silently "fixing" the invalid nesting by
// closing the button early, splitting it into two separate elements (visible
// as the chevron rendering in its own little boxed-off area, per Dani's
// screenshot, 2026-10-03). That split is also why clicking the title/text
// area didn't open the step: most of the row had been parsed as sitting
// outside the real <button>, only the chevron (ending up back inside) still
// worked.
function SectionTitle({ n, children }: { n: number; children: string }) {
  return (
    <span className={styles.groupTitle}>
      <span className={styles.sectionNumber}>{n}</span>
      {children}
    </span>
  );
}

type StepToggleState = "open" | "closed" | "future";

// Each step card's whole header is one button (per Dani, 2026-10-03: once
// you've gone back to a filled-in step, opening/closing it should be a
// single easy click, not just a tiny icon target). "open"/"closed" are both
// freely clickable — clicking toggles that step open or collapses it back
// to its summary. "future" (not reached yet) is muted and inert — you can't
// skip ahead to a step before confirming the one before it.
function StepCardHead({
  n,
  title,
  state,
  onClick,
}: {
  n: number;
  title: string;
  state: StepToggleState;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={styles.stepCardHead} onClick={onClick} disabled={!onClick}>
      <SectionTitle n={n}>{title}</SectionTitle>
      <span
        className={`${styles.stepToggle} ${state === "open" ? styles.stepToggleOpen : ""} ${
          state === "future" ? styles.stepToggleFuture : ""
        }`}
        aria-hidden="true"
      >
        <ChevronDownIcon size={14} />
      </span>
    </button>
  );
}

export default function DanceEntryForm({
  studioManagerId,
  manager,
  competition,
  entries,
  editingEntry,
  onSubmit,
  onClose,
  onDirtyChange,
}: Props) {
  const [danceName, setDanceName] = useState("");
  const [choreographerName, setChoreographerName] = useState("");
  // No pre-picked default for any of these three (per Dani, 2026-10-03: she
  // wants an explicit "בחרו..." placeholder, not a silently auto-filled
  // first option that's easy to submit without ever actually looking at) —
  // each starts empty and is validated as required, same as the text fields.
  const [danceLevel, setDanceLevel] = useState<"A" | "B" | "C" | "">("");
  const [participantCount, setParticipantCount] = useState("");
  const [stepDivision, setStepDivision] = useState("");
  const [danceStyle, setDanceStyle] = useState("");
  const [customDanceStyle, setCustomDanceStyle] = useState("");
  const [dancerName, setDancerName] = useState("");
  // Pre-filled from the manager's own profile (editable — see
  // StepHeader/groupTitle "פרטי מנהל/ת סטודיו" below), not read-only: Dani wants
  // these changeable per dance (e.g. a guest choreographer entering under a
  // different studio name), so they're plain controlled inputs, not derived.
  const [managerName, setManagerName] = useState(manager.managerName ?? "");
  const [studioName, setStudioName] = useState(manager.studioName);
  const [city, setCity] = useState(manager.city ?? "");
  // Real accordion: only one step is ever expanded at a time (0 = all
  // collapsed). Confirming a step opens the next one and collapses this one
  // into a summary line. Separately, `furthestStep` tracks how far she's
  // actually progressed — any already-reached step's header can be clicked
  // to freely open/close it again (per Dani, 2026-10-03: going back to a
  // filled-in step to peek at it shouldn't cost more than one click each
  // way), without that re-opening counting as "going backward" in progress.
  // Starts on step 2 (skipping the manager step entirely) when the profile
  // already has all three manager fields filled in — the common case, since
  // they're auto-filled — so a busy manager entering her 10th dance doesn't
  // have to click through a step that's already correct.
  const initialStep = !manager.managerName || !manager.studioName || !manager.city ? 1 : 2;
  const [openStep, setOpenStep] = useState<0 | 1 | 2 | 3>(initialStep);
  const [furthestStep, setFurthestStep] = useState<1 | 2 | 3>(initialStep);
  // Per-field red "שדה חובה" markers (per Dani, 2026-10-03: she wants to see
  // exactly which fields are missing, not just one generic message) — keyed
  // by field name, cleared individually as each one gets filled in. Not a
  // replacement for the native `required` attributes still on every input:
  // those remain as the real validation; this is purely the extra visible
  // cue for the custom-styled fields (selects/day-picker) the browser's own
  // validation UI doesn't reach, plus consistent red text for all of them.
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  function clearFieldError(field: string) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));
  }
  // Split into a single required "preferred" day and a single optional
  // "alternate" day (per Dani, 2026-10-03: a backup in case the preferred
  // one is already full) rather than the old free multi-select — still
  // saved as the same preferredDays[] (first = preferred, second =
  // alternate) so the DB/admin side needs no schema change.
  const [preferredDay, setPreferredDay] = useState("");
  const [alternateDay, setAlternateDay] = useState("");
  const [wantsVideo, setWantsVideo] = useState(false);
  const [wantsStills, setWantsStills] = useState(false);
  const [songFile, setSongFile] = useState<File | null>(null);
  const [songDurationSeconds, setSongDurationSeconds] = useState<number | undefined>(undefined);
  const [existingSongFilePath, setExistingSongFilePath] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  // dayError: the day picker is a row of plain buttons, not a native form
  // control, so the browser's own required-field validation (which already
  // covers every other required field below) never sees it — without this,
  // forgetting to pick a day meant clicking "הוספה" silently did nothing.
  // submitError: onSubmit (Supabase insert/upload) had no catch at all until
  // now — a failed save looked identical to a successful one, just with the
  // button reverting to normal. Same bug class already fixed once in
  // ProfileEditForm; see project_dance_form_silent_failures memory.
  const [dayError, setDayError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!editingEntry) return;
    setDanceName(editingEntry.danceName);
    setChoreographerName(editingEntry.choreographerName);
    setDanceLevel(editingEntry.danceLevel);
    setParticipantCount(String(editingEntry.participantCount));
    setStepDivision(editingEntry.stepDivision);
    if (DANCE_STYLES.includes(editingEntry.danceStyle)) {
      setDanceStyle(editingEntry.danceStyle);
      setCustomDanceStyle("");
    } else {
      setDanceStyle(OTHER_STYLE);
      setCustomDanceStyle(editingEntry.danceStyle);
    }
    setDancerName(editingEntry.dancerName ?? "");
    setManagerName(editingEntry.managerName);
    setStudioName(editingEntry.studioName);
    setCity(editingEntry.city);
    const existingDays = editingEntry.preferredDays ?? [];
    setPreferredDay(existingDays[0] ?? "");
    setAlternateDay(existingDays[1] ?? "");
    // An existing entry always has every required field already filled in
    // (they couldn't have been saved otherwise) — land on the last step,
    // the one most likely to actually change on a re-edit, rather than
    // forcing a click back through steps that are already correct.
    setOpenStep(3);
    setFurthestStep(3);
    setFieldErrors({});
    setDayError(false);
    setWantsVideo(editingEntry.wantsVideo);
    setWantsStills(editingEntry.wantsStills);
    setSongFile(null);
    setSongDurationSeconds(editingEntry.songDurationSeconds);
    setExistingSongFilePath(editingEntry.songFilePath);
  }, [editingEntry]);

  const count = Number(participantCount) || 0;
  // The category dropdown was removed (per Dani, 2026-10-03) — participant
  // count alone now drives it, so there's nothing left that could disagree.
  const resolvedCategory = categoryFromParticipantCount(count);
  const musicCutoffIso = getMusicSubmissionCutoffIso(competition.date);
  const dayOptions = getCompetitionDayOptions(competition.date);
  const showDayQuestion = dayOptions.length > 1 && !NO_DAY_SELECTION_SLUGS.has(competition.slug);
  const alternateDayOptions = dayOptions.filter((d) => d.date !== preferredDay);
  const perParticipantPrice = computePrice(competition.priceTiers, resolvedCategory);
  const surcharge = computeSurcharge(resolvedCategory, songDurationSeconds, count);
  const resolvedDanceStyle = danceStyle === OTHER_STYLE ? customDanceStyle : danceStyle;

  // Whether tearing this form down right now would silently throw away real
  // data (per Dani, 2026-10-03: switching to step 2 mid-entry used to do
  // exactly that, with no warning). Editing an existing entry compares
  // against its saved values, since merely opening the edit form isn't
  // itself a change; adding a new one just checks whether anything's been
  // typed/picked yet.
  const hasUnsavedChanges = editingEntry
    ? danceName !== editingEntry.danceName ||
      choreographerName !== editingEntry.choreographerName ||
      participantCount !== String(editingEntry.participantCount) ||
      danceLevel !== editingEntry.danceLevel ||
      stepDivision !== editingEntry.stepDivision ||
      resolvedDanceStyle !== editingEntry.danceStyle ||
      dancerName !== (editingEntry.dancerName ?? "") ||
      managerName !== editingEntry.managerName ||
      studioName !== editingEntry.studioName ||
      city !== editingEntry.city ||
      preferredDay !== (editingEntry.preferredDays?.[0] ?? "") ||
      alternateDay !== (editingEntry.preferredDays?.[1] ?? "") ||
      wantsVideo !== editingEntry.wantsVideo ||
      wantsStills !== editingEntry.wantsStills ||
      songFile !== null
    : danceName !== "" ||
      choreographerName !== "" ||
      participantCount !== "" ||
      danceLevel !== "" ||
      stepDivision !== "" ||
      danceStyle !== "" ||
      dancerName !== "" ||
      preferredDay !== "" ||
      wantsVideo ||
      wantsStills ||
      songFile !== null;

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);
  const isSolo = count === 1;
  // Group judging/time-limit category (3 min, per-participant surcharge
  // rate) — separate from pricing, which multiplies by headcount for every
  // non-solo category (see computeTotalPrice's comment, lib/pricing.ts).
  const isGroup = count >= 5;
  const baseSubtotal = perParticipantPrice != null ? perParticipantPrice * (isSolo ? 1 : count) : null;

  // Video and stills are two independent services, flat 150₪ each regardless
  // of how many dances order them (see computeRecordingFeeForType's comment).
  const videoFee = wantsVideo ? computeRecordingFeeForType() : 0;
  const stillsFee = wantsStills ? computeRecordingFeeForType() : 0;
  const recordingFee = videoFee + stillsFee;

  const totalPrice = computeTotalPrice(competition.priceTiers, resolvedCategory, count, songDurationSeconds, recordingFee);

  // Autocomplete suggestions drawn from this manager's OTHER dances (across
  // every competition, not just this one — the same choreographer usually
  // works across all of them) — with 15-20 dances being normal, re-typing
  // the same choreographer/dancer name that many times is real, avoidable
  // busywork. Dance name is deliberately excluded: it should always be
  // unique per dance, so suggesting a past one would actively mislead.
  const choreographerSuggestions = Array.from(new Set(entries.map((e) => e.choreographerName).filter(Boolean)));
  const dancerNameSuggestions = Array.from(new Set(entries.map((e) => e.dancerName).filter((n): n is string => !!n)));
  const customStyleSuggestions = Array.from(
    new Set(entries.map((e) => e.danceStyle).filter((style) => !DANCE_STYLES.includes(style)))
  );
  // +/- stepper (per Dani's reference, 2026-10-03) — floors at 1 either way,
  // so repeatedly clicking "-" can't walk it down to 0 or negative, and the
  // first click of either button from an empty field lands on 1.
  function adjustParticipantCount(delta: number) {
    setParticipantCount((prev) => String(Math.max(1, (Number(prev) || 0) + delta)));
  }

  // If what she typed under "אחר" turns out to exactly match a real style
  // that's already in the list, snap back to that real option instead of
  // saving a duplicate free-text copy of it — avoids the same style existing
  // as two different-looking values in the data (one picked, one typed).
  function handleCustomStyleChange(value: string) {
    const matched = DANCE_STYLES.find((style) => style === value.trim());
    if (matched) {
      setDanceStyle(matched);
      setCustomDanceStyle("");
    } else {
      setCustomDanceStyle(value);
    }
  }

  function selectPreferredDay(date: string) {
    setPreferredDay(date);
    setDayError(false);
    // Primary and alternate must be different days — clear a now-redundant
    // alternate rather than leaving it silently pointing at the same day.
    if (alternateDay === date) setAlternateDay("");
  }

  // Optional, so unlike the preferred day this one toggles off on a second
  // click of the same button.
  function selectAlternateDay(date: string) {
    setAlternateDay((prev) => (prev === date ? "" : date));
  }

  function confirmStep1() {
    const errors = {
      managerName: !managerName,
      studioName: !studioName,
      city: !city,
    };
    setFieldErrors((prev) => ({ ...prev, ...errors }));
    if (Object.values(errors).some(Boolean)) return;

    setFurthestStep((prev) => Math.max(prev, 2) as 1 | 2 | 3);
    setOpenStep(2);
  }

  function confirmStep2() {
    const dayMissing = showDayQuestion && !preferredDay;
    setDayError(dayMissing);

    const errors = {
      danceName: !danceName,
      participantCount: count < 1,
      dancerName: isSolo && !dancerName,
      choreographerName: !choreographerName,
      danceLevel: !danceLevel,
      stepDivision: !stepDivision,
      danceStyle: !danceStyle,
      customDanceStyle: danceStyle === OTHER_STYLE && !customDanceStyle,
    };
    setFieldErrors((prev) => ({ ...prev, ...errors }));
    if (dayMissing || Object.values(errors).some(Boolean)) return;

    setFurthestStep((prev) => Math.max(prev, 3) as 1 | 2 | 3);
    setOpenStep(3);
  }

  // Toggles a reached step open/closed — clicking its header again collapses
  // it back to the summary; clicking a different reached step's header opens
  // that one instead (closing whichever was open), same as a classic
  // single-expand accordion.
  function toggleStep(n: 1 | 2 | 3) {
    setOpenStep((prev) => (prev === n ? 0 : n));
  }

  // Lets Enter in a text field advance the current step instead of
  // submitting the whole form early (there's only one <form>, so a native
  // Enter-to-submit would otherwise fire handleSubmit while steps 2/3
  // haven't been filled in yet). On the last step (or with nothing open),
  // Enter is left to behave normally.
  function handleFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter") return;
    if (openStep === 1) {
      e.preventDefault();
      confirmStep1();
    } else if (openStep === 2) {
      e.preventDefault();
      confirmStep2();
    }
  }

  function handleSongFileChange(file: File | null) {
    setSongFile(file);
    setSongDurationSeconds(undefined);
    if (!file || !audioRef.current) return;
    const url = URL.createObjectURL(file);
    audioRef.current.src = url;
  }

  function resetForm() {
    setDanceName("");
    setChoreographerName("");
    setDanceLevel("");
    setParticipantCount("");
    setStepDivision("");
    setDanceStyle("");
    setCustomDanceStyle("");
    setDancerName("");
    setManagerName(manager.managerName ?? "");
    setStudioName(manager.studioName);
    setCity(manager.city ?? "");
    const resetStep = !manager.managerName || !manager.studioName || !manager.city ? 1 : 2;
    setOpenStep(resetStep);
    setFurthestStep(resetStep);
    setFieldErrors({});
    setDayError(false);
    setPreferredDay("");
    setAlternateDay("");
    setWantsVideo(false);
    setWantsStills(false);
    setSongFile(null);
    setSongDurationSeconds(undefined);
    setExistingSongFilePath(undefined);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const dayMissing = showDayQuestion && !preferredDay;
    setDayError(dayMissing);
    if (dayMissing) return;

    const preferredDaysToSave = showDayQuestion
      ? [preferredDay, ...(alternateDay ? [alternateDay] : [])].filter(Boolean)
      : [];

    if (!danceName || !choreographerName || count < 1 || !danceLevel || !stepDivision || !resolvedDanceStyle) return;
    if (!managerName || !studioName || !city) return;
    if (isSolo && !dancerName) return;

    setSubmitting(true);
    try {
      const songFilePath = songFile
        ? await uploadDanceMusic(supabaseBrowserClient, studioManagerId, songFile)
        : existingSongFilePath;

      await onSubmit(
        {
          competitionId: competition.id,
          danceName,
          category: resolvedCategory,
          participantCount: count,
          stepDivision,
          danceStyle: resolvedDanceStyle,
          ...(isSolo ? { dancerName } : {}),
          choreographerName,
          danceLevel,
          managerName,
          studioName,
          city,
          ...(preferredDaysToSave.length > 0 ? { preferredDays: preferredDaysToSave } : {}),
          ...(songFilePath ? { songFilePath } : {}),
          ...(songDurationSeconds ? { songDurationSeconds: Math.round(songDurationSeconds) } : {}),
          wantsVideo,
          wantsStills,
        },
        editingEntry?.id
      );
      resetForm();
      onClose();
    } catch (err) {
      console.error("Dance entry save failed:", err);
      setSubmitError("השמירה נכשלה - נסו שוב, ואם זה ממשיך לקרות צרו איתנו קשר.");
    } finally {
      setSubmitting(false);
    }
  }

  // Tints the form (focus rings, dropzone, checkboxes, price total, and a
  // background glow) to this competition's accent color — see
  // lib/competitionAccentColors.ts — so the form visibly belongs to whichever
  // competition is selected in CompetitionPicker above it. The CSS module
  // builds its own translucent shades via rgba(var(--form-rgb), alpha) —
  // --form-rgb holds bare "r, g, b" tokens — rather than CSS color-mix(),
  // which isn't supported in older browsers/webviews (a first attempt using
  // color-mix() silently rendered as nothing there).
  const rgb = competition.accentColor ? hexToRgbParts(competition.accentColor) : null;
  const formStyle = rgb
    ? ({
        "--form-accent": competition.accentColor,
        "--form-rgb": `${rgb.r}, ${rgb.g}, ${rgb.b}`,
      } as CSSProperties)
    : undefined;

  const step1Open = openStep === 1;
  const step2Open = openStep === 2;
  const step3Open = openStep === 3;
  const step2Reached = furthestStep >= 2;
  const step3Reached = furthestStep >= 3;

  return (
    <form className={styles.form} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} style={formStyle}>
      <div className={styles.formHeader}>
        <h3 className={styles.title}>
          {editingEntry ? "עריכת ריקוד" : "הוספת ריקוד"} - <span className="en" lang="en">{competition.name}</span>
        </h3>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="סגירה וחזרה לרשימה">
          חזרה לרשימה
        </button>
      </div>

      {/* Step 1: פרטי מנהל/ת סטודיו — always reached (it's first), so only ever
          "open" or "closed", never "future". */}
      <div className={styles.stepCard + (step1Open ? ` ${styles.stepCardOpen}` : "")}>
        <StepCardHead
          n={1}
          title="פרטי מנהל/ת סטודיו"
          state={step1Open ? "open" : "closed"}
          onClick={() => toggleStep(1)}
        />

        {!step1Open && (
          // Pre-filled from the profile and rarely touched — collapsed to
          // one line by default so the form opens on what actually changes
          // every time (the dance itself), not three fields that are almost
          // always already correct.
          <p className={styles.managerSummary}>
            {managerName} · <span className="en" lang="en">{studioName}</span> · {city}
          </p>
        )}

        <div className={`${styles.stepBody} ${step1Open ? styles.stepBodyOpen : ""}`}>
          <div className={styles.stepBodyInner}>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>
                  שם מנהל/ת סטודיו <span className={styles.required}>*</span>
                </span>
                <input
                  required
                  autoComplete="off"
                  value={managerName}
                  onChange={(e) => {
                    setManagerName(e.target.value);
                    clearFieldError("managerName");
                  }}
                />
                {fieldErrors.managerName && <p className={styles.fieldErrorText}>שדה חובה</p>}
              </label>

              <label className={styles.field}>
                <span>
                  שם סטודיו <span className={styles.required}>*</span>
                </span>
                <input
                  required
                  autoComplete="off"
                  value={studioName}
                  onChange={(e) => {
                    setStudioName(e.target.value);
                    clearFieldError("studioName");
                  }}
                />
                {fieldErrors.studioName && <p className={styles.fieldErrorText}>שדה חובה</p>}
              </label>

              <label className={styles.field}>
                <span>
                  יישוב <span className={styles.required}>*</span>
                </span>
                <input
                  required
                  autoComplete="off"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    clearFieldError("city");
                  }}
                />
                {fieldErrors.city && <p className={styles.fieldErrorText}>שדה חובה</p>}
              </label>
            </div>
            <div className={styles.stepActions}>
              <button type="button" className={styles.stepConfirmButton} onClick={confirmStep1}>
                שלב הבא: פרטי הריקוד
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: פרטי הריקוד — the day question(s) come first, per Dani
          (2026-10-03), ahead of the dance's own details. */}
      <div
        className={
          styles.stepCard + (step2Open ? ` ${styles.stepCardOpen}` : !step2Reached ? ` ${styles.stepCardFuture}` : "")
        }
      >
        <StepCardHead
          n={2}
          title="פרטי הריקוד"
          state={step2Open ? "open" : step2Reached ? "closed" : "future"}
          onClick={step2Reached ? () => toggleStep(2) : undefined}
        />

        {step2Reached && !step2Open && (
          <p className={styles.managerSummary}>
            <span className="en" lang="en">{danceName}</span> · {displayCategoryLabel(resolvedCategory, count)} ·{" "}
            {resolvedDanceStyle}
            {preferredDay && <> · יום מועדף: {dayOptions.find((d) => d.date === preferredDay)?.label}</>}
          </p>
        )}

        <div className={`${styles.stepBody} ${step2Open ? styles.stepBodyOpen : ""}`}>
          <div className={styles.stepBodyInner}>
            {showDayQuestion && (
              <div className={styles.dayPicker}>
                <span className={styles.fieldLabel}>
                  יום מועדף <span className={styles.required}>*</span>
                </span>
                <div className={styles.dayButtons}>
                  {dayOptions.map((day) => {
                    const active = preferredDay === day.date;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        className={`${styles.dayButton} ${active ? styles.dayButtonActive : ""}`}
                        onClick={() => selectPreferredDay(day.date)}
                        aria-pressed={active}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
                {/* The day picker is plain buttons, not a native form control, so
                    the browser's own required-field validation never catches a
                    missed selection the way it does for every other required
                    field here — this is the only thing that will. */}
                {dayError && <p className={styles.fieldErrorText}>נא לבחור יום מועדף</p>}
              </div>
            )}

            {showDayQuestion && preferredDay && alternateDayOptions.length > 0 && (
              <div className={styles.dayPicker}>
                <span className={styles.fieldLabel}>יום חלופי (למקרה שהיום המועדף יהיה תפוס)</span>
                <div className={styles.dayButtons}>
                  {alternateDayOptions.map((day) => {
                    const active = alternateDay === day.date;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        className={`${styles.dayButton} ${active ? styles.dayButtonActive : ""}`}
                        onClick={() => selectAlternateDay(day.date)}
                        aria-pressed={active}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={styles.grid}>
              <label className={styles.field}>
                <span>
                  שם הריקוד <span className={styles.required}>*</span>
                </span>
                <div className={styles.fieldIconWrap}>
                  <DancerIcon size={22} />
                  <input
                    required
                    autoComplete="off"
                    value={danceName}
                    onChange={(e) => {
                      setDanceName(e.target.value);
                      clearFieldError("danceName");
                    }}
                  />
                </div>
                {fieldErrors.danceName && <p className={styles.fieldErrorText}>שדה חובה</p>}
              </label>

              <label className={styles.field}>
                <span>
                  מספר משתתפים <span className={styles.required}>*</span>
                </span>
                {/* A +/- stepper instead of a bare number input — per Dani's
                    reference (reg.artor.org.il), 2026-10-03. Still a real
                    <input type="number">, so typing a count directly still
                    works too; the buttons are just a faster alternative. */}
                <div className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.stepperButton}
                    onClick={() => adjustParticipantCount(-1)}
                    disabled={count <= 1}
                    aria-label="הפחתת משתתף"
                  >
                    <MinusIcon size={16} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    required
                    className={styles.stepperInput}
                    value={participantCount}
                    onChange={(e) => {
                      setParticipantCount(e.target.value);
                      clearFieldError("participantCount");
                    }}
                  />
                  <button
                    type="button"
                    className={styles.stepperButton}
                    onClick={() => adjustParticipantCount(1)}
                    aria-label="הוספת משתתף"
                  >
                    <PlusIcon size={16} />
                  </button>
                </div>
                {fieldErrors.participantCount && <p className={styles.fieldErrorText}>שדה חובה</p>}
                {/* The category (סולו/דואט/טריו/קוורטט/קבוצה) is no longer a
                    separate field — per Dani, 2026-10-03, it's derived
                    automatically from this count alone (see
                    categoryFromParticipantCount in lib/pricing.ts), so there's
                    nothing left to type that could disagree with it. */}
                {count > 0 && <span className={styles.durationHint}>קטגוריה: {displayCategoryLabel(resolvedCategory, count)}</span>}
              </label>

              {isSolo && (
                <label className={styles.field}>
                  <span>
                    שם הרקדנ/ית (שם מלא) <span className={styles.required}>*</span>
                  </span>
                  <div className={styles.fieldIconWrap}>
                    <PersonIcon size={15} />
                    <input
                      required
                      autoComplete="off"
                      list="dancer-name-suggestions"
                      value={dancerName}
                      onChange={(e) => {
                        setDancerName(e.target.value);
                        clearFieldError("dancerName");
                      }}
                    />
                  </div>
                  <datalist id="dancer-name-suggestions">
                    {dancerNameSuggestions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  {fieldErrors.dancerName && <p className={styles.fieldErrorText}>שדה חובה</p>}
                </label>
              )}

              <label className={styles.field}>
                <span>
                  שם כוריאוגרף/ית <span className={styles.required}>*</span>
                </span>
                <div className={styles.fieldIconWrap}>
                  <PersonIcon size={15} />
                  <input
                    required
                    autoComplete="off"
                    list="choreographer-suggestions"
                    value={choreographerName}
                    onChange={(e) => {
                      setChoreographerName(e.target.value);
                      clearFieldError("choreographerName");
                    }}
                  />
                </div>
                <datalist id="choreographer-suggestions">
                  {choreographerSuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                {fieldErrors.choreographerName && <p className={styles.fieldErrorText}>שדה חובה</p>}
              </label>
            </div>

            <div className={styles.grid}>
              <label className={styles.field}>
                <span>
                  רמת הרקדנים <span className={styles.required}>*</span>
                </span>
                <select
                  required
                  value={danceLevel}
                  onChange={(e) => {
                    setDanceLevel(e.target.value as "A" | "B" | "C");
                    clearFieldError("danceLevel");
                  }}
                >
                  <option value="" disabled hidden>
                    בחרו רמת רקדנים
                  </option>
                  {DANCE_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.danceLevel && <p className={styles.fieldErrorText}>שדה חובה</p>}
              </label>

              <label className={styles.field}>
                <span>
                  חלוקת גיל (STEP) <span className={styles.required}>*</span>
                </span>
                <select
                  required
                  value={stepDivision}
                  onChange={(e) => {
                    setStepDivision(e.target.value);
                    clearFieldError("stepDivision");
                  }}
                >
                  <option value="" disabled hidden>
                    בחרו חלוקת גיל
                  </option>
                  {STEP_DIVISIONS.map((division) => (
                    <option key={division} value={division}>
                      {division}
                    </option>
                  ))}
                </select>
                {fieldErrors.stepDivision && <p className={styles.fieldErrorText}>שדה חובה</p>}
              </label>

              <label className={styles.field}>
                <span>
                  סגנון ריקוד <span className={styles.required}>*</span>
                </span>
                <select
                  required
                  value={danceStyle}
                  onChange={(e) => {
                    setDanceStyle(e.target.value);
                    clearFieldError("danceStyle");
                  }}
                >
                  <option value="" disabled hidden>
                    בחרו סגנון ריקוד
                  </option>
                  {DANCE_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                  <option value={OTHER_STYLE}>{OTHER_STYLE}</option>
                </select>
                {fieldErrors.danceStyle && <p className={styles.fieldErrorText}>שדה חובה</p>}
              </label>

              {danceStyle === OTHER_STYLE && (
                <label className={styles.field}>
                  <span>
                    איזה סגנון? <span className={styles.required}>*</span>
                  </span>
                  <input
                    required
                    autoComplete="off"
                    list="custom-style-suggestions"
                    value={customDanceStyle}
                    onChange={(e) => {
                      handleCustomStyleChange(e.target.value);
                      clearFieldError("customDanceStyle");
                    }}
                  />
                  <datalist id="custom-style-suggestions">
                    {customStyleSuggestions.map((style) => (
                      <option key={style} value={style} />
                    ))}
                  </datalist>
                  {fieldErrors.customDanceStyle && <p className={styles.fieldErrorText}>שדה חובה</p>}
                </label>
              )}
            </div>

            <div className={styles.stepActions}>
              <button type="button" className={styles.stepConfirmButton} onClick={confirmStep2}>
                שלב הבא: מוזיקה והזמנות
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: מוזיקה והזמנות נלוות — the last step, so it never collapses
          back into a summary once reached; the form's real submit button
          (in the footer below) is its "confirm". */}
      <div className={styles.stepCard + (step3Open ? ` ${styles.stepCardOpen}` : !step3Reached ? ` ${styles.stepCardFuture}` : "")}>
        <StepCardHead
          n={3}
          title="מוזיקה והזמנות נלוות"
          state={step3Open ? "open" : step3Reached ? "closed" : "future"}
          onClick={step3Reached ? () => toggleStep(3) : undefined}
        />

        {step3Reached && !step3Open && (
          <p className={styles.managerSummary}>
            {songFile || existingSongFilePath ? "קובץ שיר הועלה" : "ללא קובץ שיר"}
            {wantsVideo && " · צילום וידאו"}
            {wantsStills && " · צילום סטילס"}
          </p>
        )}

        <div className={`${styles.stepBody} ${step3Open ? styles.stepBodyOpen : ""}`}>
          <div className={styles.stepBodyInner}>
            <p className={styles.timeLimitHint}>
              אורך מקסימלי לשיר: <strong>{isGroup ? "3 דקות" : "2 דקות"}</strong> - חריגה גוררת תוספת תשלום (ראו פירוט
              למטה אם השיר שהועלה חורג), ואם לא שולמה מראש - הורדת ניקוד בתחרות במקום.
            </p>
            <div className={styles.mediaGrid}>
              <div className={styles.dropzoneField}>
                {/* Not actually enforced at submit time — Dani wants managers able
                    to add the song later, before payment, not blocked on it here —
                    so this deliberately doesn't use the same `required`-field
                    asterisk as everything above it; that would promise an
                    enforcement this field doesn't have. */}
                <span className={styles.fieldLabel}>קובץ שיר הריקוד</span>
                <label className={styles.dropzone}>
                  <input
                    type="file"
                    accept="audio/*"
                    className={styles.dropzoneInput}
                    onChange={(e) => handleSongFileChange(e.target.files?.[0] ?? null)}
                  />
                  <UploadIcon />
                  <span className={styles.dropzoneText}>לחצו להעלאת קובץ מוזיקה</span>
                  <span className={styles.dropzoneHint}>
                    MP3/WAV עד 100MB - אפשר להוסיף גם מאוחר יותר, לפני התשלום
                    {musicCutoffIso && (
                      <>
                        {" "}
                        (לא יאוחר מ-<strong dir="ltr">{formatDateHe(musicCutoffIso)}</strong>)
                      </>
                    )}
                  </span>
                </label>
                {/* Hidden — used only to read the file's real duration via the browser, no server processing. */}
                <audio
                  ref={audioRef}
                  hidden
                  onLoadedMetadata={(e) => setSongDurationSeconds(e.currentTarget.duration)}
                />
                {songFile && <span className={styles.durationHint}>{songFile.name}</span>}
                {songDurationSeconds != null && (
                  <span className={styles.durationHint}>
                    משך השיר: {Math.floor(songDurationSeconds / 60)}:
                    {String(Math.round(songDurationSeconds % 60)).padStart(2, "0")}
                  </span>
                )}
                {!songFile && existingSongFilePath && (
                  <span className={styles.durationHint}>קובץ קיים מועלה - ניתן להחליף</span>
                )}
              </div>

              <div className={styles.checkboxField}>
                {/* Invisible — reserves the same vertical space as the
                    "קובץ שיר הריקוד" label on the dropzone side, so the two
                    columns' real content (the dropzone box / the checkbox
                    cards) lines up on the same top edge instead of this
                    column's cards starting higher (per Dani, 2026-10-03). */}
                <span className={styles.fieldLabel} aria-hidden="true" style={{ visibility: "hidden" }}>
                  הזמנות נלוות
                </span>
                <label className={styles.checkboxCard}>
                  <span className={styles.checkboxMain}>
                    <input type="checkbox" checked={wantsVideo} onChange={(e) => setWantsVideo(e.target.checked)} />
                    <VideoCameraIcon size={20} />
                    <span>
                      <span className={styles.checkboxTitle}>הזמנת צילום וידאו</span>
                      <span className={styles.checkboxSubtitle}>הקלטת וידאו מקצועית של הריקוד</span>
                    </span>
                  </span>
                  <span className={styles.checkboxPrice}>150 ₪</span>
                </label>
                <label className={styles.checkboxCard}>
                  <span className={styles.checkboxMain}>
                    <input type="checkbox" checked={wantsStills} onChange={(e) => setWantsStills(e.target.checked)} />
                    <CameraIcon size={20} />
                    <span>
                      <span className={styles.checkboxTitle}>הזמנת צילום סטילס</span>
                      <span className={styles.checkboxSubtitle}>תמונות סטילס מקצועיות מהריקוד</span>
                    </span>
                  </span>
                  <span className={styles.checkboxPrice}>150 ₪</span>
                </label>
              </div>
            </div>

            {surcharge > 0 && (
              <p className={styles.surchargeNote}>
                שימו לב: משך השיר חורג ממגבלת הזמן ({isGroup ? "3" : "2"}{" "}
                דקות) - נוספה תוספת תשלום של <strong>{formatPrice(surcharge)}₪</strong> בהתאם לתקנון (אחרת יש הורדת ניקוד במקום).
              </p>
            )}

            <div className={styles.footer}>
              <div className={styles.priceBreakdown}>
                <div className={styles.priceBreakdownRow}>
                  <span>קטגוריה לתמחור</span>
                  <span>{displayCategoryLabel(resolvedCategory, count)}</span>
                </div>
                {baseSubtotal != null && (
                  <div className={styles.priceBreakdownRow}>
                    <span>
                      מחיר בסיס{!isSolo ? ` (${formatPrice(perParticipantPrice!)}₪ × ${count} משתתפים)` : ""}
                      {isGroup && competition.priceTiers && (
                        <span className={styles.priceExplain}>
                          {" "}
                          · {isEarlyPricing(competition.priceTiers) ? "מחיר מוקדם" : "מחיר רגיל"}
                        </span>
                      )}
                    </span>
                    <span>{formatPrice(baseSubtotal)}₪</span>
                  </div>
                )}
                {surcharge > 0 && (
                  <div className={styles.priceBreakdownRow}>
                    <span>תוספת חריגת זמן בשיר</span>
                    <span>{formatPrice(surcharge)}₪</span>
                  </div>
                )}
                {videoFee > 0 && (
                  <div className={styles.priceBreakdownRow}>
                    <span>צילום וידאו</span>
                    <span>{formatPrice(videoFee)}₪</span>
                  </div>
                )}
                {stillsFee > 0 && (
                  <div className={styles.priceBreakdownRow}>
                    <span>צילום סטילס</span>
                    <span>{formatPrice(stillsFee)}₪</span>
                  </div>
                )}
                {totalPrice != null && (
                  <div className={`${styles.priceBreakdownRow} ${styles.priceBreakdownTotal}`}>
                    <span>מחיר כולל</span>
                    <span>{formatPrice(totalPrice)}₪</span>
                  </div>
                )}
              </div>
              {submitError && <p className={styles.submitError}>{submitError}</p>}

              <div className={styles.actions}>
                <button type="button" className={styles.cancelButton} onClick={onClose}>
                  ביטול
                </button>
                <button type="submit" className={styles.submitButton} disabled={submitting}>
                  {submitting ? "שולחים..." : editingEntry ? "שמירת שינויים" : "הוספה"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
