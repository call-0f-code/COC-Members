/**
 * birthdayEmailTemplate.ts
 * Subject, HTML and plain-text content of the birthday email.
 *
 * Email HTML rules followed here: table layout, inline styles, no external
 * CSS or web fonts, and explicit width/height on images. The <style> block
 * only adds a mobile layout and is safe to ignore for clients that strip it.
 */

// Brand colours (same as the website)
const CREAM = "#F5E6D3";
const RUST = "#C1502E";
const BROWN = "#2C1810";
const GOLD = "#F2B33D"; // celebration accent, used sparingly

const FONT = "'Segoe UI',Helvetica,Arial,sans-serif";
const HEADING_FONT = "'Arial Black','Segoe UI Black',Arial,sans-serif";
const MONO_FONT = "Consolas,'Courier New',monospace";

export function escapeHtml(s: string): string {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/** The URL if it's a usable http(s) image link, otherwise null. */
function imageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export function buildBirthdaySubject(memberName: string): string {
  return `Happy Birthday, ${firstName(memberName)}! 🎂`;
}

/** A strip of brand-coloured blocks along the top edge of the card. */
function colourStrip(): string {
  const colours = [RUST, GOLD, BROWN, CREAM, RUST, BROWN, GOLD, RUST, CREAM, BROWN, GOLD, RUST];
  const cells = colours
    // Percentage widths so the strip shrinks with the card on phones
    .map((c) => `<td width="8%" height="12" style="background:${c};font-size:0;line-height:0;">&nbsp;</td>`)
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:4px solid ${BROWN};"><tr>${cells}</tr></table>`;
}

/**
 * The member's profile photo, or a 🎂 tile of the same size when there is
 * none. Width/height attributes are set for clients (e.g. Outlook) that
 * ignore CSS sizing; the alt text shows when a client blocks images.
 */
function portrait(safeName: string, photoUrl: string | null | undefined): string {
  const src = imageUrl(photoUrl);
  const frame = `border:4px solid ${BROWN};box-shadow:6px 6px 0 0 ${BROWN};`;
  if (src) {
    return `<img src="${escapeHtml(src)}" width="140" height="140" alt="${safeName}"
                 style="display:block;width:140px;height:140px;object-fit:cover;background:${CREAM};${frame}" />`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td width="140" height="140" align="center" valign="middle"
                style="width:140px;height:140px;background:${CREAM};font-size:64px;line-height:140px;${frame}">🎂</td>
          </tr></table>`;
}

const WISHES: Array<[string, string, string]> = [
  ["🚀", "Big wins", "Projects that ship and ideas that click."],
  ["🧩", "Fewer bugs", "And the hard problems finally cracking."],
  ["🌱", "Growth", "Something new learned every single week."],
  ["🤝", "Good company", "Great memories with the community."],
];

function wishCard([icon, title, text]: [string, string, string]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:${CREAM};border:3px solid ${BROWN};">
            <tr><td style="padding:16px 18px;">
              <div style="font-size:26px;line-height:1;margin-bottom:8px;">${icon}</div>
              <div style="font-family:${HEADING_FONT};font-size:14px;color:${BROWN};text-transform:uppercase;letter-spacing:1px;">${title}</div>
              <div style="font-family:${FONT};font-size:14px;line-height:1.5;color:${BROWN};margin-top:4px;">${text}</div>
            </td></tr>
          </table>`;
}

function wishGrid(): string {
  const row = (a: number, b: number) => `
          <tr>
            <td class="stack" width="50%" valign="top" style="padding:0 8px 16px 0;">${wishCard(WISHES[a])}</td>
            <td class="stack" width="50%" valign="top" style="padding:0 0 16px 8px;">${wishCard(WISHES[b])}</td>
          </tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${row(0, 1)}${row(2, 3)}</table>`;
}

export function buildBirthdayHtml(memberName: string, photoUrl?: string | null): string {
  const safe = escapeHtml(memberName);
  const first = escapeHtml(firstName(memberName));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- Ask mail apps not to recolour the brand palette in dark mode -->
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>Happy Birthday, ${first}!</title>
  <style>
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 24px !important; padding-right: 24px !important; }
      .stack { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; }
      .h1 { font-size: 24px !important; letter-spacing: 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
  <!-- Inbox preview text (hidden in the email itself) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${CREAM};">
    The whole Call of Code community is wishing you a happy birthday, ${first}! 🎉
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};">
    <tr>
      <td align="center" style="padding:32px 12px 40px 12px;">

        <!-- Brand line -->
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 0 14px 4px;font-family:${MONO_FONT};font-size:14px;font-weight:bold;color:${BROWN};letter-spacing:1px;">
              &lt;/&gt; CALL OF CODE
            </td>
          </tr>
        </table>

        <!-- Card -->
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0"
               style="width:600px;max-width:600px;background:#ffffff;border:4px solid ${BROWN};box-shadow:10px 10px 0 0 ${BROWN};">
          <tr><td>${colourStrip()}</td></tr>

          <!-- Header -->
          <tr>
            <td align="center" class="px" style="background:${RUST};padding:36px 40px 40px 40px;border-bottom:4px solid ${BROWN};">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:${GOLD};border:3px solid ${BROWN};padding:6px 14px;font-family:${HEADING_FONT};font-size:12px;letter-spacing:2px;color:${BROWN};text-transform:uppercase;">
                    🎉 It's your day
                  </td>
                </tr>
              </table>
              ${portrait(safe, photoUrl)}
              <h1 class="h1" style="margin:28px 0 0 0;font-family:${HEADING_FONT};font-size:36px;line-height:1.15;color:${CREAM};text-transform:uppercase;letter-spacing:1px;">
                Happy Birthday, ${first}!
              </h1>
              <p style="margin:10px 0 0 0;font-family:${FONT};font-size:16px;color:${CREAM};opacity:0.9;">
                From all of us at Call of Code
              </p>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td class="px" style="padding:40px 48px 8px 48px;font-family:${FONT};color:${BROWN};">
              <p style="margin:0 0 18px 0;font-size:20px;font-weight:bold;">Hey ${first},</p>
              <p style="margin:0 0 18px 0;font-size:17px;line-height:1.7;">
                The entire <strong>Call of Code</strong> community is wishing you a very
                <strong style="color:${RUST};">happy birthday!</strong>
              </p>
              <p style="margin:0 0 28px 0;font-size:17px;line-height:1.7;">
                We're really glad you're part of this community. Here's to a year of
                great code, exciting challenges, and plenty to celebrate.
              </p>

              <!-- Terminal line -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BROWN};border:3px solid ${BROWN};margin:0 0 32px 0;">
                <tr>
                  <td style="padding:16px 20px;font-family:${MONO_FONT};font-size:14px;line-height:1.6;color:${CREAM};">
                    <span style="color:${GOLD};">$</span> git commit -m <span style="color:${GOLD};">"Another year of awesome 🎉"</span><br/>
                    <span style="opacity:0.7;">[main 🎂] 1 birthday, 365 days of new adventures</span>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0;font-family:${HEADING_FONT};font-size:14px;letter-spacing:2px;text-transform:uppercase;color:${RUST};">
                Wishing you a year of
              </p>
              ${wishGrid()}

              <p style="margin:16px 0 6px 0;font-size:17px;line-height:1.7;">
                Have an amazing day. You've earned it!
              </p>
              <p style="margin:0 0 40px 0;font-size:17px;line-height:1.7;">
                With love,<br/>
                <strong style="color:${RUST};">The Call of Code Team</strong> ❤️
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" class="px" style="background:${BROWN};padding:24px 40px;">
              <p style="margin:0 0 6px 0;font-family:${MONO_FONT};font-size:14px;font-weight:bold;letter-spacing:1px;color:${CREAM};">
                &lt;/&gt; CALL OF CODE
              </p>
              <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${CREAM};opacity:0.75;">
                You're getting this because you're a member of the Call of Code community.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function buildBirthdayText(memberName: string): string {
  const first = firstName(memberName);
  return [
    `Happy Birthday, ${first}! 🎂`,
    "",
    `Hey ${first},`,
    "",
    "The entire Call of Code community is wishing you a very happy birthday!",
    "",
    "We're really glad you're part of this community. Here's to a year of",
    "great code, exciting challenges, and plenty to celebrate.",
    "",
    "Wishing you a year of:",
    ...WISHES.map(([icon, title, text]) => `  ${icon} ${title}: ${text}`),
    "",
    "Have an amazing day. You've earned it!",
    "",
    "With love,",
    "The Call of Code Team",
  ].join("\n");
}
