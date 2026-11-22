import { jsPDF } from 'jspdf';
import { BioProfile, CvWatermarkConfig } from '../types';
import { applyCustomPdfFonts } from './pdfFonts';
import { generateUniqueCvDocId } from './cvTracking';
import { getRealTimeCvProjects } from './cvProjects';
import { buildRealTimeCvContent } from './cvContent';

/**
 * Loads an image from a URL or fallback and converts to Base64 with circular clipping for jsPDF
 */
async function loadCircularAvatarBase64(imageUrl?: string): Promise<string | null> {
  if (!imageUrl) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // 1. Pre-fill entire square canvas with the exact sidebar background color (#0E1626 / rgb(14, 22, 38))
        // This guarantees that the 4 corners outside the circular mask match the sidebar perfectly and eliminates the 4 white corner dots
        ctx.fillStyle = '#0E1626';
        ctx.fillRect(0, 0, size, size);

        // 2. Draw circular clipping mask
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // 3. Draw centered image within the circle
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
        ctx.restore();

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Could not process avatar image for PDF:', err);
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve(null);
    };
    setTimeout(() => resolve(null), 2500);
    img.src = imageUrl;
  });
}

/**
 * Generates the customized executive CV PDF with a full premium design:
 * - Palette: Deep charcoal-navy + muted bronze-gold
 * - Typography: Serif for name, clean sans elsewhere with letter-spaced headings
 * - Photo: Thin gold ring border
 * - Headings: Solid gold left-accent bar in main column; gold square bullets throughout
 * - Top gold band: Slim accent strip across the header
 * - Single-page fit guarantee
 */
export async function generateMrsCvPdf(
  profile: BioProfile,
  watermarkConfig?: CvWatermarkConfig,
  docUniqueId?: string
): Promise<{ doc: jsPDF; filename: string; docUniqueId: string }> {
  const activeDocId = docUniqueId && docUniqueId.trim() ? docUniqueId.trim() : generateUniqueCvDocId();
  const liveCv = buildRealTimeCvContent(profile);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Load custom typography if available; standard fallbacks: times (serif) & helvetica (sans)
  const { headingFont, bodyFont } = await applyCustomPdfFonts(doc);
  const nameSerifFont = 'times';
  const sansFont = headingFont !== 'helvetica' ? headingFont : 'helvetica';
  const bodySansFont = bodyFont !== 'helvetica' ? bodyFont : 'helvetica';

  const pageWidth = 210;
  const pageHeight = 297;
  const sidebarWidth = 66;
  const mainX = 74;
  const mainWidth = 126;
  const rightMargin = mainX + mainWidth;

  // 1. Top Slim Gold Accent Band (across entire page header)
  doc.setFillColor(197, 160, 89); // Muted Bronze-Gold (#C5A059)
  doc.rect(0, 0, pageWidth, 2.2, 'F');

  // 2. Left Sidebar Background (Deep Charcoal-Navy #0E1626)
  doc.setFillColor(14, 22, 38);
  doc.rect(0, 2.2, sidebarWidth, pageHeight - 2.2, 'F');

  // Subtle Sidebar Right Border (Muted Bronze-Gold hairline)
  doc.setDrawColor(197, 160, 89);
  doc.setLineWidth(0.4);
  doc.line(sidebarWidth, 2.2, sidebarWidth, pageHeight);

  // Helper to draw clean geometric gold square bullets
  const drawGoldSquareBullet = (x: number, y: number, size = 1.2) => {
    doc.setFillColor(197, 160, 89);
    doc.rect(x, y - 2.0, size, size, 'F');
  };

  // 3. Avatar in Sidebar with Thin Gold Ring Border
  const avatarCenterX = sidebarWidth / 2;
  const avatarCenterY = 22;
  const avatarRadius = 12.5;

  // Attempt to load and render circular avatar image
  const avatarUrl = profile.avatarUrl || '/mrs_profile_avatar.jpg';
  const avatarBase64 = await loadCircularAvatarBase64(avatarUrl);

  if (avatarBase64) {
    try {
      doc.addImage(
        avatarBase64,
        'PNG',
        avatarCenterX - avatarRadius,
        avatarCenterY - avatarRadius,
        avatarRadius * 2,
        avatarRadius * 2,
        undefined,
        'FAST'
      );
      // Clean circular outer masks in sidebar background color (#0E1626) to guarantee no corner dots
      doc.setDrawColor(14, 22, 38);
      doc.setLineWidth(8);
      doc.circle(avatarCenterX, avatarCenterY, avatarRadius + 4, 'S');
      doc.setLineWidth(8);
      doc.circle(avatarCenterX, avatarCenterY, avatarRadius + 11, 'S');

      // Thin gold ring border framing the circular photo
      doc.setDrawColor(197, 160, 89);
      doc.setLineWidth(0.6);
      doc.circle(avatarCenterX, avatarCenterY, avatarRadius, 'S');
    } catch (e) {
      console.warn('Avatar image placement error, rendering fallback monogram', e);
      renderAvatarMonogram(doc, avatarCenterX, avatarCenterY, avatarRadius);
    }
  } else {
    renderAvatarMonogram(doc, avatarCenterX, avatarCenterY, avatarRadius);
  }

  // 4. Name in Sidebar (Serif Typography — Cambria / Times style)
  const fullName = profile.personalDetails?.fullName || 'MAHBUBUR RAHMAN SHAHIN';
  const nameParts = fullName.toUpperCase().split(' ');
  let firstName = nameParts.slice(0, 2).join(' ') || 'MAHBUBUR RAHMAN';
  let lastName = nameParts.slice(2).join(' ') || 'SHAHIN';
  if (nameParts.length <= 2) {
    firstName = nameParts[0] || 'MAHBUBUR';
    lastName = nameParts[1] || 'SHAHIN';
  }

  let sideY = 41;
  doc.setTextColor(248, 250, 252);
  doc.setFont(nameSerifFont, 'bold');
  doc.setFontSize(11);
  doc.text(firstName, avatarCenterX, sideY, { align: 'center' });
  sideY += 4.3;
  doc.text(lastName, avatarCenterX, sideY, { align: 'center' });
  sideY += 5.2;

  // 5. Role Subtitles (Muted Bronze-Gold with clean tracking in Sans, synced live from roleTitle)
  doc.setTextColor(197, 160, 89);
  doc.setFont(sansFont, 'bold');
  doc.setFontSize(6.0);

  liveCv.roleLinesSpaced.forEach((line) => {
    const fittedLine = doc.splitTextToSize(line, sidebarWidth - 6)[0] || line;
    doc.text(fittedLine, avatarCenterX, sideY, { align: 'center' });
    sideY += 3.3;
  });

  sideY += 3.0;

  // Sidebar Helper for Section Headings with Gold Left-Accent Bar
  const drawSidebarHeading = (titleWithSpacing: string, yPos: number): number => {
    // Gold Left Accent Bar
    doc.setFillColor(197, 160, 89);
    doc.rect(7, yPos - 3.2, 1.6, 3.8, 'F');

    doc.setTextColor(197, 160, 89);
    doc.setFont(sansFont, 'bold');
    doc.setFontSize(7.2);
    doc.text(titleWithSpacing, 10.5, yPos);

    doc.setDrawColor(197, 160, 89);
    doc.setLineWidth(0.2);
    doc.line(10.5, yPos + 1.2, sidebarWidth - 7, yPos + 1.2);

    return yPos + 4.5;
  };

  // --- SIDEBAR SECTION 1: CONTACT ---
  sideY = drawSidebarHeading('C O N T A C T', sideY);
  doc.setFont(bodySansFont, 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(226, 232, 240);

  const email = profile.socials?.email || 'mr216873@gmail.com';
  const phone = profile.socials?.phone || '+880 961 105 6361';
  const gravatarUrl = profile.socials?.gravatarUrl?.replace('https://', '').replace('http://', '') || 'gravatar.com/mrxshahin';

  // Contact section: email, contact phone, and Gravatar profile link (LinkedIn removed from CV only)
  const contactItems = [email, phone, gravatarUrl];

  contactItems.forEach((item) => {
    const wrapped = doc.splitTextToSize(item, sidebarWidth - 14);
    wrapped.forEach((line: string) => {
      doc.text(line, 7, sideY);
      sideY += 3.2;
    });
    sideY += 0.6;
  });

  sideY += 1.8;

  // --- SIDEBAR SECTION 2: CORE SKILLS ---
  sideY = drawSidebarHeading('C O R E   S K I L L S', sideY);
  doc.setFont(bodySansFont, 'normal');
  doc.setFontSize(6.0);
  doc.setTextColor(226, 232, 240);

  liveCv.coreSkills.forEach((skill) => {
    drawGoldSquareBullet(7, sideY, 1.1);
    const wrapped = doc.splitTextToSize(skill, sidebarWidth - 17);
    wrapped.forEach((line: string) => {
      doc.text(line, 10, sideY);
      sideY += 3.0;
    });
    sideY += 0.35;
  });

  sideY += 1.8;

  // --- SIDEBAR SECTION 3: TOOLS & ENVIRONMENTS ---
  sideY = drawSidebarHeading('T E C H   S T A C K', sideY);
  doc.setFont(bodySansFont, 'normal');
  doc.setFontSize(6.0);
  doc.setTextColor(226, 232, 240);

  liveCv.techStack.forEach((tool) => {
    drawGoldSquareBullet(7, sideY, 1.1);
    const wrapped = doc.splitTextToSize(tool, sidebarWidth - 17);
    wrapped.forEach((line: string) => {
      doc.text(line, 10, sideY);
      sideY += 3.0;
    });
    sideY += 0.35;
  });

  sideY += 2.0;

  // --- SIDEBAR SECTION 4: LANGUAGES ---
  sideY = drawSidebarHeading('L A N G U A G E S', sideY);
  doc.setFont(bodySansFont, 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(226, 232, 240);

  const languages = profile.languages || [
    { name: 'English', level: 'Conversational / Proficient' },
    { name: 'Bengali', level: 'Native / Bilingual' },
    { name: 'Hindi', level: 'Basic Spoken' },
  ];

  languages.forEach((lang) => {
    drawGoldSquareBullet(7, sideY, 1.1);
    doc.text(`${lang.name} — ${lang.level}`, 10, sideY);
    sideY += 3.3;
  });

  sideY += 2.0;

  // --- SIDEBAR SECTION 5: COURSES & CERTIFICATIONS ---
  sideY = drawSidebarHeading('C E R T I F I C A T I O N S', sideY);
  doc.setFont(bodySansFont, 'normal');
  doc.setFontSize(6.1);
  doc.setTextColor(226, 232, 240);

  const certs = profile.coursesCertifications || [
    'Basic Computer Course (360-Hour Certified)',
    'Android Hardware & System Repair Training',
    'IELTS Academic Certification — Band 5.5',
    'Remote Systems Administration & Security',
  ];

  certs.forEach((cert) => {
    drawGoldSquareBullet(7, sideY, 1.1);
    const wrapped = doc.splitTextToSize(cert, sidebarWidth - 17);
    wrapped.forEach((line: string) => {
      doc.text(line, 10, sideY);
      sideY += 3.1;
    });
    sideY += 0.3;
  });

  sideY += 2.0;

  // --- SIDEBAR SECTION 6: INTERESTS ---
  sideY = drawSidebarHeading('I N T E R E S T S', sideY);
  doc.setFont(bodySansFont, 'normal');
  doc.setFontSize(6.1);
  doc.setTextColor(226, 232, 240);

  liveCv.interests.forEach((interest) => {
    drawGoldSquareBullet(7, sideY, 1.1);
    const wrapped = doc.splitTextToSize(interest, sidebarWidth - 17);
    wrapped.forEach((line: string) => {
      doc.text(line, 10, sideY);
      sideY += 3.1;
    });
    sideY += 0.3;
  });

  sideY += 2.0;

  // --- SIDEBAR SECTION 7: PERSONAL DETAILS ---
  sideY = drawSidebarHeading('P E R S O N A L   D E T A I L S', sideY);
  doc.setFont(bodySansFont, 'normal');
  doc.setFontSize(6.1);
  doc.setTextColor(226, 232, 240);

  const pDetails = profile.personalDetails || {
    dateOfBirth: '23/07/2002',
    nationality: 'Bangladeshi',
    religion: 'Islam',
  };

  const detailsList = [
    `Date of Birth: ${pDetails.dateOfBirth || '23/07/2002'}`,
    `Nationality: ${pDetails.nationality || 'Bangladeshi'}`,
    `Religion: ${pDetails.religion || 'Islam'}`,
    'Work Eligibility: Global Remote / Contract',
  ];

  detailsList.forEach((detail) => {
    drawGoldSquareBullet(7, sideY, 1.1);
    doc.text(detail, 10, sideY);
    sideY += 3.3;
  });

  // --- SIDEBAR BOTTOM: OFFICIAL DOCUMENT VERIFICATION BADGE ---
  const boxX = 6;
  const boxY = 276;
  const boxW = sidebarWidth - 12;
  const boxH = 15;

  doc.setFillColor(21, 30, 46); // elevated panel (#151E2E)
  doc.roundedRect(boxX, boxY, boxW, boxH, 1.2, 1.2, 'F');
  doc.setDrawColor(197, 160, 89); // gold hairline
  doc.setLineWidth(0.25);
  doc.roundedRect(boxX, boxY, boxW, boxH, 1.2, 1.2, 'S');

  doc.setFont(sansFont, 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(197, 160, 89); // Gold
  doc.text('DOCUMENT VERIFICATION SERIAL', boxX + boxW / 2, boxY + 4.2, { align: 'center' });

  doc.setFont(sansFont, 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(248, 250, 252); // Crisp white
  doc.text(activeDocId, boxX + boxW / 2, boxY + 8.8, { align: 'center' });

  doc.setFont(bodySansFont, 'normal');
  doc.setFontSize(4.6);
  doc.setTextColor(148, 163, 184); // Muted slate
  doc.text('Biometric Verified · Official Copy', boxX + boxW / 2, boxY + 12.8, { align: 'center' });

  // ==========================================
  // RIGHT MAIN COLUMN (Crisp, High-Contrast Light)
  // ==========================================

  // --- TOP RIGHT DOCUMENT VERIFICATION SERIAL & CONFIDENTIAL BADGE ---
  doc.setFont(sansFont, 'bold');
  doc.setFontSize(5.0);
  doc.setTextColor(148, 163, 184);
  doc.text('CONFIDENTIAL · OFFICIAL DOCUMENT', rightMargin, 7.8, { align: 'right' });

  doc.setFont(sansFont, 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(197, 160, 89);
  doc.text(`DOC SERIAL: ${activeDocId}`, rightMargin, 11.2, { align: 'right' });

  // --- SUBTLE FIXED CONFIDENTIAL WATERMARK ---
  if (watermarkConfig?.enabled !== false) {
    const rawWatermark = (watermarkConfig?.text || 'M R S • CONFIDENTIAL').trim().toUpperCase();
    const tone = watermarkConfig?.tone || 'subtle-gold';
    const position = watermarkConfig?.position || 'diagonal-center';

    // Apply delicate, readable watermark tone
    if (tone === 'subtle-gold') {
      doc.setTextColor(244, 239, 226); // Delicate Champagne-Gold tint
    } else if (tone === 'extra-faint') {
      doc.setTextColor(248, 249, 251); // Extra-Faint Whisper Slate
    } else {
      doc.setTextColor(236, 240, 246); // Neutral Slate
    }

    doc.setFont(sansFont, 'bold');
    const centerX = mainX + mainWidth / 2;

    if (position === 'triple-diagonal') {
      doc.setFontSize(14);
      doc.text(rawWatermark, centerX, 75, { align: 'center', angle: -32 });
      doc.text(rawWatermark, centerX, 155, { align: 'center', angle: -32 });
      doc.text(rawWatermark, centerX, 235, { align: 'center', angle: -32 });
    } else {
      doc.setFontSize(21);
      doc.text(rawWatermark, centerX, pageHeight / 2 + 10, { align: 'center', angle: -34 });
    }
  }

  let mainY = 14;

  // Main Heading with Solid Gold Left-Accent Bar & Letter-Spaced Title
  const drawMainHeading = (titleWithSpacing: string, yPos: number): number => {
    // Solid Gold Left-Accent Bar
    doc.setFillColor(197, 160, 89);
    doc.rect(mainX, yPos - 3.8, 2.4, 4.8, 'F');

    // Title Text in Deep Charcoal-Navy (#0E1626)
    doc.setTextColor(14, 22, 38);
    doc.setFont(sansFont, 'bold');
    doc.setFontSize(9.5);
    doc.text(titleWithSpacing, mainX + 4.8, yPos);

    return yPos + 6.2;
  };

  // --- MAIN SECTION 1: PROFILE ---
  mainY = drawMainHeading('P R O F I L E', mainY);
  doc.setFont(bodySansFont, 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 41, 59);

  liveCv.profileParagraphs.forEach((p) => {
    const wrapped = doc.splitTextToSize(p, mainWidth);
    wrapped.forEach((line: string) => {
      doc.text(line, mainX, mainY);
      mainY += 3.6;
    });
    mainY += 1.9;
  });

  mainY += 1.4;

  // --- MAIN SECTION 2: WHAT I CAN HELP WITH ---
  mainY = drawMainHeading('W H A T   I   C A N   H E L P   W I T H', mainY);
  doc.setFont(bodySansFont, 'normal');
  doc.setFontSize(7.0);
  doc.setTextColor(30, 41, 59);

  liveCv.whatICanHelpWith.forEach((item) => {
    drawGoldSquareBullet(mainX + 0.5, mainY, 1.2);
    doc.setTextColor(30, 41, 59);
    doc.setFont(bodySansFont, 'normal');
    const wrapped = doc.splitTextToSize(item, mainWidth - 4.5).slice(0, 2);
    wrapped.forEach((line: string) => {
      doc.text(line, mainX + 4.2, mainY);
      mainY += 3.45;
    });
  });

  mainY += 0.8;
  doc.setFont(bodySansFont, 'italic');
  doc.setFontSize(6.9);
  doc.setTextColor(100, 116, 139);
  doc.text(liveCv.availabilityNote, mainX, mainY);
  mainY += 5.8;

  // --- MAIN SECTION 3: WORK EXPERIENCE ---
  mainY = drawMainHeading('W O R K   E X P E R I E N C E', mainY);

  liveCv.workExperience.forEach((exp) => {
    doc.setFont(sansFont, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(14, 22, 38);
    doc.text(exp.role, mainX, mainY);

    doc.setFont(bodySansFont, 'normal');
    doc.setFontSize(7.0);
    doc.setTextColor(100, 116, 139);
    doc.text(exp.period, rightMargin, mainY, { align: 'right' });

    mainY += 3.3;

    doc.setFont(bodySansFont, 'italic');
    doc.setFontSize(7.0);
    doc.setTextColor(168, 132, 62);
    doc.text(exp.location, mainX, mainY);

    mainY += 3.5;

    exp.highlights.forEach((hl) => {
      drawGoldSquareBullet(mainX + 0.5, mainY, 1.2);
      doc.setTextColor(51, 65, 85);
      doc.setFont(bodySansFont, 'normal');
      doc.setFontSize(7.05);
      const wrapped = doc.splitTextToSize(hl, mainWidth - 4.5);
      wrapped.forEach((line: string) => {
        doc.text(line, mainX + 4.2, mainY);
        mainY += 3.35;
      });
      mainY += 0.9;
    });

    mainY += 1.2;
  });

  mainY += 1.2;

  // --- MAIN SECTION 4: DIGITAL PROJECTS (Real-time synchronized, strictly no website addresses) ---
  mainY = drawMainHeading('D I G I T A L   P R O J E C T S', mainY);

  const projectItems = getRealTimeCvProjects(profile.projects);
  const maxProjectsEndY = 239; // Reserves room for Education + Commitment on single A4 page

  if (projectItems.length <= 4) {
    projectItems.forEach((proj) => {
      if (mainY + 11 > maxProjectsEndY) return;

      doc.setFont(sansFont, 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(14, 22, 38);
      doc.text(proj.name, mainX, mainY);

      if (proj.badge) {
        doc.setFont(sansFont, 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(168, 132, 62);
        doc.text(proj.badge, rightMargin, mainY, { align: 'right' });
      }

      mainY += 3.5;

      drawGoldSquareBullet(mainX + 0.5, mainY, 1.2);

      doc.setTextColor(51, 65, 85);
      doc.setFont(bodySansFont, 'normal');
      doc.setFontSize(7.1);
      const wrapped = doc.splitTextToSize(proj.desc, mainWidth - 4.5).slice(0, 3);
      wrapped.forEach((line: string) => {
        doc.text(line, mainX + 4.2, mainY);
        mainY += 3.4;
      });

      mainY += 1.5;
    });
  } else {
    const colGap = 5.5;
    const colWidth = (mainWidth - colGap) / 2;

    for (let i = 0; i < projectItems.length; i += 2) {
      if (mainY + 11.5 > maxProjectsEndY) break;

      const rowPair = [projectItems[i], projectItems[i + 1]].filter(Boolean);
      let rowBottomY = mainY;

      rowPair.forEach((proj, colIdx) => {
        const cellX = mainX + colIdx * (colWidth + colGap);
        let cellY = mainY;

        doc.setFont(sansFont, 'bold');
        doc.setFontSize(7.1);
        doc.setTextColor(14, 22, 38);
        const titleLine = doc.splitTextToSize(proj.name, colWidth)[0] || proj.name;
        doc.text(titleLine, cellX, cellY);
        cellY += 2.7;

        if (proj.badge) {
          doc.setFont(sansFont, 'bold');
          doc.setFontSize(5.6);
          doc.setTextColor(168, 132, 62);
          const badgeLine = doc.splitTextToSize(proj.badge.toUpperCase(), colWidth)[0] || proj.badge.toUpperCase();
          doc.text(badgeLine, cellX, cellY);
          cellY += 2.8;
        }

        drawGoldSquareBullet(cellX + 0.3, cellY, 1.0);
        doc.setTextColor(51, 65, 85);
        doc.setFont(bodySansFont, 'normal');
        doc.setFontSize(6.25);

        const wrappedAll: string[] = doc.splitTextToSize(proj.desc, colWidth - 3.6);
        const lines = wrappedAll.slice(0, 2);
        if (wrappedAll.length > 2 && lines[1]) {
          lines[1] = `${lines[1].replace(/[.,;:\s]+$/, '').slice(0, Math.max(0, lines[1].length - 2)).trimEnd()}...`;
        }

        lines.forEach((line: string) => {
          doc.text(line, cellX + 3.2, cellY);
          cellY += 2.85;
        });

        if (cellY > rowBottomY) {
          rowBottomY = cellY;
        }
      });

      mainY = rowBottomY + 1.5;
    }
  }

  mainY += 1.2;

  // --- MAIN SECTION 5: EDUCATION ---
  mainY = drawMainHeading('E D U C A T I O N', mainY);

  const educationList = profile.education || [
    {
      degree: 'Bachelor of Social Science (BSS)',
      institution: 'Sylhet Government College, Sylhet',
      period: 'Jan 2021 – Present',
    },
    {
      degree: 'Higher Secondary Certificate (HSC)',
      institution: 'Tajpur Degree College, Sylhet',
      period: 'Jan 2019 – Dec 2020',
      gpa: 'GPA: 3.33 / 5.00',
    },
    {
      degree: 'Secondary School Certificate (SSC)',
      institution: 'Mongol Chondi Nishikanto High School, Sylhet',
      period: 'Jan 2017 – Dec 2018',
      gpa: 'GPA: 3.39 / 5.00',
    },
  ];

  educationList.forEach((edu) => {
    doc.setFont(sansFont, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(14, 22, 38);
    doc.text(edu.degree, mainX, mainY);

    doc.setFont(bodySansFont, 'normal');
    doc.setFontSize(7.0);
    doc.setTextColor(100, 116, 139);
    doc.text(edu.period, rightMargin, mainY, { align: 'right' });

    mainY += 3.4;

    doc.setFont(bodySansFont, 'italic');
    doc.setFontSize(7.1);
    doc.setTextColor(71, 85, 105);
    const subText = edu.gpa ? `${edu.institution} | ${edu.gpa}` : edu.institution;
    doc.text(subText, mainX, mainY);

    mainY += 4.2;
  });

  mainY += 2.0;

  // --- MAIN SECTION 6: KEY STRENGTHS & COMMITMENT ---
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(mainX, mainY, rightMargin, mainY);
  mainY += 3.5;

  doc.setFont(bodySansFont, 'italic');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  const decWrapped = doc.splitTextToSize(liveCv.commitmentNote, mainWidth);
  decWrapped.forEach((line: string) => {
    doc.text(line, mainX, mainY);
    mainY += 3.2;
  });

  // Footer stamp with official verification serial
  doc.setFont(bodySansFont, 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(148, 163, 184);
  const now = new Date();
  const dateStr = `${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;
  doc.text(`Official Executive CV · Serial: ${activeDocId} · Verified by M R S · Synchronized ${dateStr}`, mainX, 290);

  // Embed official PDF document properties metadata
  doc.setProperties({
    title: `M R S - Executive CV (${activeDocId})`,
    subject: `Official Executive CV - Verification Serial ${activeDocId}`,
    author: 'M R S',
    keywords: `CV, Resume, IT Support, ${activeDocId}`,
    creator: 'M R S Portfolio Verification System',
  });

  const filename = getFormattedCvFilename();
  return { doc, filename, docUniqueId: activeDocId };
}

export function getFormattedCvFilename(): string {
  return 'M R S CV.pdf';
}

function renderAvatarMonogram(doc: jsPDF, cx: number, cy: number, radius: number) {
  doc.setFillColor(21, 30, 46);
  doc.circle(cx, cy, radius, 'F');
  doc.setTextColor(197, 160, 89);
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text('MRS', cx, cy + 3.2, { align: 'center' });
}

