import { useState, useEffect, useMemo } from "react";
import { getDrives, createBooking } from "../api";
import { BL } from "../tokens";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const MOBILISE_OPTIONS = ["DBS - Group Tec", "NUS Alumni - CompSci", "Tampines East RC"];
const INVITE_STATUSES = ["Critical", "High", "Low"];
const ORGANIZER_NAME = "Bryan";
const TARGET_RSVPS = 18;
const TIME_OPTIONS_PER_PAGE = 5;
const SLOT_WINDOWS = {
  breakfast: [7, 8, 9],
  lunch: [11, 12, 13],
  "after work": [17, 18, 19],
};
const SLOT_LABELS = Object.keys(SLOT_WINDOWS);

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function formatTime(hour, minute = 0) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function addTwoAndHalfHours(hour) {
  const endHour = hour + 2;
  return `${formatTime(endHour, 30)}`;
}

function buildTimeOptions() {
  return Array.from({ length: 10 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + 1 + Math.floor(Math.random() * 5));

    const slotLabel = pickRandom(SLOT_LABELS);
    const startHour = pickRandom(SLOT_WINDOWS[slotLabel]);
    const distance = (Math.random() * 11 + 1).toFixed(1);
    const site = Math.random() > 0.5 ? "MOBILE UNIT ON SITE" : `BLOODBANK@HSA ${distance}KM`;

    return {
      id: `${date.toISOString().slice(0, 10)}-${slotLabel}-${startHour}-${i}`,
      label: date.toLocaleDateString("en-SG", { weekday: "short", day: "2-digit", month: "short" }),
      time: `${slotLabel} • ${formatTime(startHour)}-${addTwoAndHalfHours(startHour)}`,
      site,
    };
  });
}

function HostDriveBubble({ onInviteSent }) {
  const [showPanel, setShowPanel] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [modalStep, setModalStep] = useState("group");
  const [timePage, setTimePage] = useState(0);
  const timeOptions = useMemo(() => buildTimeOptions(), []);
  const inviteBloodType = useMemo(() => pickRandom(BLOOD_TYPES), []);
  const inviteStatus = useMemo(() => pickRandom(INVITE_STATUSES), []);
  const totalMembers = useMemo(() => 96 + Math.floor(Math.random() * 65), []);
  const timePageCount = Math.ceil(timeOptions.length / TIME_OPTIONS_PER_PAGE);
  const visibleTimeOptions = timeOptions.slice(
    timePage * TIME_OPTIONS_PER_PAGE,
    timePage * TIME_OPTIONS_PER_PAGE + TIME_OPTIONS_PER_PAGE
  );
  const selectedTimeOption = timeOptions.find(option => option.id === selectedTime);
  const modalTitle = modalStep === "group"
    ? "Who do you want to mobilise?"
    : modalStep === "time"
      ? "When works for your team?"
      : "Review the invite";
  const modalStepNumber = modalStep === "group" ? 1 : modalStep === "time" ? 2 : 3;
  const modalDescription = modalStep === "group"
    ? "You'll send a one-tap invite to your squard. We'll handle scheduling with HSA."
    : modalStep === "time"
      ? `SUGGESTED - BASE ON ${selectedOption}`
      : null;

  function openModal() {
    setModalStep("group");
    setShowPanel(true);
  }

  function closeModal() {
    setShowPanel(false);
    setModalStep("group");
    setTimePage(0);
  }

  function sendInvite() {
    if (!selectedTimeOption) return;

    onInviteSent({
      driveId: `hosted-${Date.now()}`,
      name: `${selectedOption} blood drive`,
      date: `${selectedTimeOption.label} · ${selectedTimeOption.time}`,
      location: selectedTimeOption.site,
      acceptedBloodTypes: [inviteBloodType],
      booked: 0,
      capacity: TARGET_RSVPS,
    });
    closeModal();
  }

  return (
    <div style={{
      background: BL.card,
      border: `1px solid ${BL.hair}`,
      borderRadius: 8,
      padding: "14px 16px",
    }}>
      <div style={{ fontFamily: BL.mono, fontSize: 10, fontWeight: 700, color: BL.red, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 5 }}>
        HOST A DRIVE
      </div>
      <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink, marginBottom: 3 }}>
        Mobilise your workplace, school, or RC
      </div>
      <div style={{ fontFamily: BL.sans, fontSize: 12, color: BL.muted, lineHeight: 1.45 }}>
        We'll coordinate a mobile unit with the HSA on your behalf
      </div>
      <button
        type="button"
        onClick={openModal}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 12,
          padding: "7px 12px",
          background: "#fff",
          color: BL.ink,
          border: `1px solid ${BL.ink}`,
          borderRadius: 6,
          fontFamily: BL.sans,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Start a drive
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
          <path
            d="M5 3l4 4-4 4M9 7H2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {showPanel && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          background: "rgba(26, 25, 23, 0.28)",
        }}>
          <div style={{
            width: "100%",
            maxWidth: 420,
            background: BL.card,
            border: `1px solid ${BL.hair}`,
            borderRadius: 8,
            boxShadow: "0 18px 48px rgba(26, 25, 23, 0.18)",
            padding: 18,
          }}>
            {modalStep !== "group" && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => setModalStep(modalStep === "review" ? "time" : "group")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 0,
                    background: "none",
                    color: BL.ink,
                    border: "none",
                    fontFamily: BL.sans,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                    <path
                      d="M9 3L5 7l4 4M5 7h7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Back
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close mobilisation options"
                  style={{
                    padding: 0,
                    background: "none",
                    border: "none",
                    color: BL.muted,
                    fontFamily: BL.sans,
                    fontSize: 18,
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                  x
                </button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.faint, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 5 }}>
                  {modalStepNumber}/3 steps
                </div>
                <div style={{ fontFamily: BL.sans, fontSize: 16, fontWeight: 700, color: BL.ink, marginBottom: 5 }}>
                  {modalTitle}
                </div>
                <div style={{
                  fontFamily: modalStep === "time" ? BL.mono : BL.sans,
                  fontSize: modalStep === "time" ? 11 : 12,
                  color: BL.muted,
                  lineHeight: 1.45,
                  letterSpacing: modalStep === "time" ? 0.4 : 0,
                  textTransform: modalStep === "time" ? "uppercase" : "none",
                }}>
                  {modalStep === "review" ? (
                    <>
                      We'll send this via Whatsapp + email to 128 members of <b style={{ color: BL.ink }}>{selectedOption}</b>. Reply RSVP one tap
                    </>
                  ) : modalDescription}
                </div>
              </div>
              {modalStep === "group" && (
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close mobilisation options"
                  style={{
                    padding: 0,
                    flexShrink: 0,
                    border: "none",
                    background: "none",
                    color: BL.muted,
                    fontFamily: BL.sans,
                    fontSize: 18,
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                  x
                </button>
              )}
            </div>
            {modalStep === "group" ? (
              <>
                <div style={{ display: "grid", gap: 8 }}>
                  {MOBILISE_OPTIONS.map(option => {
                    const selected = selectedOption === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedOption(option)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: selected ? "#fff" : BL.fill,
                          color: BL.ink,
                          border: `1px solid ${selected ? BL.ink : BL.hair}`,
                          borderRadius: 6,
                          fontFamily: BL.sans,
                          fontSize: 13,
                          fontWeight: 600,
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={!selectedOption}
                  onClick={() => { setTimePage(0); setModalStep("time"); }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    width: "100%",
                    marginTop: 14,
                    padding: "10px 12px",
                    background: selectedOption ? BL.ink : BL.fill,
                    color: selectedOption ? "#fff" : BL.muted,
                    border: `1px solid ${selectedOption ? BL.ink : BL.hair}`,
                    borderRadius: 6,
                    fontFamily: BL.sans,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: selectedOption ? "pointer" : "default",
                  }}
                >
                  Continue
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                    <path
                      d="M5 3l4 4-4 4M9 7H2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Set Time
                </button>
              </>
            ) : modalStep === "time" ? (
              <div>
                <div style={{ display: "grid", gap: 8 }}>
                  {visibleTimeOptions.map(option => {
                    const selected = selectedTime === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedTime(option.id)}
                        style={{
                          width: "100%",
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px",
                          background: selected ? "#fff" : BL.fill,
                          color: BL.ink,
                          border: `1px solid ${selected ? BL.ink : BL.hair}`,
                          borderRadius: 6,
                          fontFamily: BL.sans,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
                            {option.label}
                          </span>
                          <span style={{ display: "block", fontFamily: BL.mono, fontSize: 11, color: BL.muted }}>
                            {option.time}
                          </span>
                        </span>
                        <span style={{
                          justifySelf: "end",
                          fontFamily: BL.mono,
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          textTransform: "uppercase",
                          color: BL.red,
                          whiteSpace: "nowrap",
                        }}>
                          {option.site}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginTop: 12,
                }}>
                  <button
                    type="button"
                    disabled={timePage === 0}
                    onClick={() => setTimePage(page => Math.max(0, page - 1))}
                    style={{
                      padding: "6px 10px",
                      background: BL.fill,
                      color: timePage === 0 ? BL.faint : BL.ink,
                      border: `1px solid ${BL.hair}`,
                      borderRadius: 6,
                      fontFamily: BL.sans,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: timePage === 0 ? "default" : "pointer",
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted }}>
                    {timePage + 1} / {timePageCount}
                  </span>
                  <button
                    type="button"
                    disabled={timePage === timePageCount - 1}
                    onClick={() => setTimePage(page => Math.min(timePageCount - 1, page + 1))}
                    style={{
                      padding: "6px 10px",
                      background: BL.fill,
                      color: timePage === timePageCount - 1 ? BL.faint : BL.ink,
                      border: `1px solid ${BL.hair}`,
                      borderRadius: 6,
                      fontFamily: BL.sans,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: timePage === timePageCount - 1 ? "default" : "pointer",
                    }}
                  >
                    Next
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!selectedTime}
                  onClick={() => setModalStep("review")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    width: "100%",
                    marginTop: 14,
                    padding: "10px 12px",
                    background: selectedTime ? BL.ink : BL.fill,
                    color: selectedTime ? "#fff" : BL.muted,
                    border: `1px solid ${selectedTime ? BL.ink : BL.hair}`,
                    borderRadius: 6,
                    fontFamily: BL.sans,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: selectedTime ? "pointer" : "default",
                  }}
                >
                  Continue
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                    <path
                      d="M5 3l4 4-4 4M9 7H2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Draft Invite
                </button>
              </div>
            ) : (
              <div>
                <div style={{
                  background: BL.fill,
                  border: `1px solid ${BL.hair}`,
                  borderRadius: 8,
                  padding: 14,
                  fontFamily: BL.sans,
                  fontSize: 13,
                  color: BL.ink,
                  lineHeight: 1.55,
                  marginBottom: 14,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    Preview
                  </div>
                  {ORGANIZER_NAME} is organising a drive at {selectedTimeOption?.label}, {selectedTimeOption?.time}, {selectedTimeOption?.site} - {inviteBloodType} is currently at <b>{inviteStatus}</b> nationally. Tap to RSVP -- it's about 15 minutes.
                </div>
                <div style={{
                  background: BL.card,
                  border: `1px solid ${BL.hair}`,
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 14,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", marginBottom: 10 }}>
                    <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.ink }}>
                      <b>14 {inviteBloodType}</b> - eligible • {totalMembers} total members.
                    </div>
                    <div style={{
                      flexShrink: 0,
                      fontFamily: BL.mono,
                      fontSize: 10,
                      fontWeight: 700,
                      color: BL.red,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                    }}>
                      WE NEED {TARGET_RSVPS} RSVPs
                    </div>
                  </div>
                  <div style={{ height: 6, background: BL.fill, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: 0,
                      background: BL.red,
                      borderRadius: 3,
                    }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setModalStep("time")}
                    style={{
                      padding: "10px 12px",
                      background: "#fff",
                      color: BL.ink,
                      border: `1px solid ${BL.ink}`,
                      borderRadius: 6,
                      fontFamily: BL.sans,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={sendInvite}
                    style={{
                      padding: "10px 12px",
                      background: BL.ink,
                      color: "#fff",
                      border: `1px solid ${BL.ink}`,
                      borderRadius: 6,
                      fontFamily: BL.sans,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Send Invite
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DonorDrivesPanel() {
  const [filter, setFilter] = useState("");
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingState, setBookingState] = useState({});

  useEffect(() => { loadDrives(""); }, []);

  async function loadDrives(bt) {
    setLoading(true);
    setError("");
    try {
      const data = await getDrives(bt || null);
      setDrives(data.drives ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFilter(bt) {
    setFilter(bt);
    loadDrives(bt);
  }

  function addHostedDrive(drive) {
    setDrives(prev => [drive, ...prev]);
  }

  async function book(driveId) {
    setBookingState(prev => ({ ...prev, [driveId]: { loading: true } }));
    try {
      const res = await createBooking({ driveId, slotTime: new Date().toISOString() });
      setBookingState(prev => ({ ...prev, [driveId]: { done: true, result: res } }));
    } catch (e) {
      setBookingState(prev => ({ ...prev, [driveId]: { error: e.message } }));
    }
  }

  return (
    <div>
      <div style={{ padding: "0 0 10px" }}>
        {drives.length > 0 && (
          <div style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: BL.muted, marginBottom: 2 }}>
            {drives.length} active
          </div>
        )}
        <div style={{ fontFamily: BL.sans, fontSize: 22, fontWeight: 600, color: BL.ink, letterSpacing: -0.4, lineHeight: 1.2 }}>
          Drives near you
        </div>
      </div>

      {/* Blood type filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        <button
          onClick={() => handleFilter("")}
          style={{
            padding: "5px 14px", borderRadius: 20, fontFamily: BL.sans, fontSize: 12,
            cursor: "pointer", border: `1px solid ${filter === "" ? BL.ink : BL.hair}`,
            background: filter === "" ? BL.ink : "none",
            color: filter === "" ? "#fff" : BL.muted,
          }}
        >
          All types
        </button>
        {BLOOD_TYPES.map(bt => (
          <button
            key={bt}
            onClick={() => handleFilter(bt)}
            style={{
              padding: "5px 14px", borderRadius: 20, fontFamily: BL.mono, fontSize: 12,
              cursor: "pointer", border: `1px solid ${filter === bt ? BL.ink : BL.hair}`,
              background: filter === bt ? BL.fill : "none",
              color: filter === bt ? BL.ink : BL.muted,
            }}
          >
            {bt}
          </button>
        ))}
      </div>

      {loading && <div style={{ fontFamily: BL.sans, color: BL.muted, fontSize: 13 }}>Loading drives…</div>}
      {error && <div style={{ fontFamily: BL.sans, color: BL.need.critical.fg, fontSize: 13 }}>{error}</div>}
      {!loading && drives.length === 0 && (
        <div style={{ fontFamily: BL.sans, color: BL.faint, fontSize: 13, marginBottom: 12 }}>No upcoming drives found.</div>
      )}
      <div style={{ marginBottom: 18 }}>
        <HostDriveBubble onInviteSent={addHostedDrive} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {drives.map(drive => {
          const pct = drive.capacity > 0 ? (drive.booked / drive.capacity) * 100 : 0;
          const bs = bookingState[drive.driveId] ?? {};
          const almostFull = pct > 80;

          return (
            <div key={drive.driveId} style={{
              background: BL.card, border: `1px solid ${BL.hair}`, borderRadius: 6, padding: 14,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: BL.sans, fontSize: 14, fontWeight: 600, color: BL.ink, marginBottom: 4 }}>
                    {drive.name ?? drive.location}
                  </div>
                  <div style={{ fontFamily: BL.mono, fontSize: 10, color: BL.muted, letterSpacing: 0.4 }}>
                    {drive.date} · {drive.location}
                  </div>
                </div>
                {drive.acceptedBloodTypes?.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", marginLeft: 10 }}>
                    {drive.acceptedBloodTypes.slice(0, 4).map(t => (
                      <span key={t} style={{
                        fontFamily: BL.mono, fontSize: 10, background: BL.fill,
                        borderRadius: 3, padding: "2px 6px", color: BL.ink2,
                      }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: almostFull ? BL.need.urgent.fg : BL.muted }}>
                    {drive.booked ?? 0} / {drive.capacity ?? "?"} slots
                  </span>
                  {almostFull && (
                    <span style={{ fontFamily: BL.mono, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: BL.need.urgent.fg }}>
                      Almost full
                    </span>
                  )}
                </div>
                <div style={{ height: 4, background: BL.fill, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${Math.min(100, pct)}%`,
                    background: almostFull ? BL.need.urgent.fg : BL.ink,
                    borderRadius: 2,
                  }} />
                </div>
              </div>

              {bs.done ? (
                <div style={{ fontFamily: BL.sans, fontSize: 13, color: BL.need.ok.fg, fontWeight: 500 }}>
                  ✓ Booked — see you there!
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => book(drive.driveId)}
                    disabled={bs.loading}
                    style={{
                      padding: "8px 20px", background: BL.ink, color: "#fff",
                      border: "none", borderRadius: 6, fontFamily: BL.sans, fontSize: 13,
                      fontWeight: 600, cursor: "pointer", opacity: bs.loading ? 0.5 : 1,
                    }}
                  >
                    {bs.loading ? "Booking…" : "RSVP"}
                  </button>
                  {bs.error && (
                    <span style={{ fontFamily: BL.sans, fontSize: 12, color: BL.need.critical.fg }}>{bs.error}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
