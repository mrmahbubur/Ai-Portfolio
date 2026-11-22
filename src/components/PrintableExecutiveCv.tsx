import React from 'react';
import { BioProfile, CvWatermarkConfig } from '../types';
import { getRealTimeCvProjects } from '../utils/cvProjects';
import { buildRealTimeCvContent } from '../utils/cvContent';

interface PrintableExecutiveCvProps {
  profile: BioProfile;
  watermarkConfig?: CvWatermarkConfig;
}

export const PrintableExecutiveCv: React.FC<PrintableExecutiveCvProps> = ({
  profile,
  watermarkConfig,
}) => {
  const avatarImageSrc = profile.avatarUrl || '/mrs_profile_avatar.jpg';

  const email = profile.socials?.email || 'mr216873@gmail.com';
  const phone = profile.socials?.phone || '+8809611056361';
  const blogUrl = profile.socials?.wordpressUrl?.replace('https://', '').replace('http://', '') || 'mrxshahin.wordpress.com';
  const githubUrl = profile.socials?.githubUrl?.replace('https://', '') || 'github.com/mrmahbubur';
  const xUrl = profile.socials?.xUrl?.replace('https://', '') || 'x.com/Mrshahinx';
  const blueskyUrl = profile.socials?.blueskyUrl?.replace('https://', '') || 'bsky.app/profile/mrxshahin.bsky.social';
  const address = profile.personalDetails?.address || 'Bharera, Tajpur-3123, Osmani Nagar, Sylhet';

  const liveCv = buildRealTimeCvContent({
    roleTitle: profile.roleTitle,
    location: profile.location,
    gravatarBio: profile.gravatarBio,
    interests: profile.interests,
    whatICanHelpWith: profile.whatICanHelpWith,
    projects: profile.projects,
  });

  const languages = profile.languages || [
    { name: 'English', level: 'Conversational' },
    { name: 'Hindi', level: 'Basic' },
    { name: 'Bengali', level: 'Native' },
  ];

  const pDetails = profile.personalDetails || {
    dateOfBirth: '23/07/2002',
    nationality: 'Bangladeshi',
    religion: 'Islam',
  };

  const helpItems = liveCv.whatICanHelpWith;
  const coreSkills = liveCv.coreSkills;
  const techStack = liveCv.techStack;

  const certificationsList = profile.coursesCertifications || [
    'Basic Computer Course (360-Hour Certified)',
    'Android Hardware & System Repair Training',
    'IELTS Academic Certification — Band 5.5',
    'Remote Systems Administration & Security',
  ];

  const interestsList = liveCv.interests;
  const workExperience = liveCv.workExperience;
  const digitalProjects = getRealTimeCvProjects(profile.projects);

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

  const now = new Date();
  const dateStr = `${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;

  return (
    <div
      id="printable-cv-root"
      className="printable-cv-page w-[210mm] min-w-[210mm] max-w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] bg-white text-[#0E1626] font-sans relative overflow-hidden box-border shadow-2xl mx-auto flex flex-col justify-between"
      style={{
        pageBreakAfter: 'avoid',
        pageBreakInside: 'avoid',
      }}
    >
      {/* Top Muted Bronze-Gold Accent Band (2.4mm) */}
      <div className="w-full h-[2.4mm] bg-[#C5A059] shrink-0" />

      {/* Main 2-Column Container */}
      <div className="flex-1 flex flex-row w-full h-[calc(297mm-2.4mm)] overflow-hidden">
        {/* ========================================================= */}
        {/* LEFT SIDEBAR (Navy Charcoal #0E1626, Width: 70mm / ~33.5%) */}
        {/* ========================================================= */}
        <aside className="w-[70mm] min-w-[70mm] max-w-[70mm] h-full bg-[#0E1626] text-[#F8FAFC] border-r border-[#C5A059]/40 p-[5mm] flex flex-col justify-between box-border overflow-hidden select-text">
          {/* Header Profile Info in Sidebar */}
          <div className="space-y-[2.2mm]">
            {/* Circular Avatar Photo with Gold Ring */}
            <div className="flex justify-center pt-[0.5mm]">
              <div className="w-[23mm] h-[23mm] rounded-full p-[0.6mm] bg-[#0E1626] border-[0.6mm] border-[#C5A059] shadow-md flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={avatarImageSrc}
                  alt="Mahbubur Rahman Shahin"
                  className="w-full h-full object-cover object-top rounded-full"
                />
              </div>
            </div>

            {/* Name in Serif Typeface */}
            <div className="text-center space-y-[0.4mm]">
              <h1 className="font-serif text-[10.5pt] font-bold tracking-tight text-[#F8FAFC] uppercase leading-tight">
                MAHBUBUR RAHMAN
                <span className="block text-[#F8FAFC]">SHAHIN</span>
              </h1>

              {/* Subtitles in letter-spaced Sans, synced live */}
              <div className="space-y-[0.6mm] pt-[0.8mm]">
                {liveCv.roleLinesPlain.map((roleLine, idx) => (
                  <p
                    key={idx}
                    className="text-[5.2pt] font-bold tracking-[0.14em] uppercase text-[#C5A059] font-sans truncate"
                  >
                    {roleLine}
                  </p>
                ))}
              </div>
            </div>

            {/* SIDEBAR SECTION 1: CONTACT */}
            <div className="space-y-[1.2mm]">
              <div className="flex items-center gap-[1.6mm]">
                <span className="w-[1.6mm] h-[3.2mm] bg-[#C5A059] shrink-0" />
                <h2 className="text-[6.6pt] font-bold tracking-[0.18em] uppercase text-[#C5A059] font-sans">
                  CONTACT
                </h2>
                <div className="flex-1 h-[0.25mm] bg-[#C5A059]/40 ml-[1mm]" />
              </div>

              <div className="space-y-[1.1mm] text-[5.8pt] text-[#CBD5E1] font-sans pl-[1.2mm] leading-tight">
                <p className="truncate"><span className="text-[#94A3B8]">Email: </span>{email}</p>
                <p className="truncate"><span className="text-[#94A3B8]">Phone: </span>{phone}</p>
                <p className="truncate"><span className="text-[#94A3B8]">Gravatar: </span>{profile.socials?.gravatarUrl?.replace('https://', '') || 'gravatar.com/mrxshahin'}</p>
              </div>
            </div>

            {/* SIDEBAR SECTION 2: CORE SKILLS */}
            <div className="space-y-[1.2mm]">
              <div className="flex items-center gap-[1.6mm]">
                <span className="w-[1.6mm] h-[3.2mm] bg-[#C5A059] shrink-0" />
                <h2 className="text-[6.6pt] font-bold tracking-[0.18em] uppercase text-[#C5A059] font-sans">
                  CORE SKILLS
                </h2>
                <div className="flex-1 h-[0.25mm] bg-[#C5A059]/40 ml-[1mm]" />
              </div>

              <div className="space-y-[1.0mm] text-[5.5pt] text-[#CBD5E1] pl-[1.2mm]">
                {coreSkills.map((skill, idx) => (
                  <div key={idx} className="flex items-start gap-[1.6mm] leading-tight">
                    <span className="w-[1.1mm] h-[1.1mm] bg-[#C5A059] mt-[0.8mm] shrink-0" />
                    <span>{skill}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SIDEBAR SECTION 3: TECH STACK */}
            <div className="space-y-[1.2mm]">
              <div className="flex items-center gap-[1.6mm]">
                <span className="w-[1.6mm] h-[3.2mm] bg-[#C5A059] shrink-0" />
                <h2 className="text-[6.6pt] font-bold tracking-[0.18em] uppercase text-[#C5A059] font-sans">
                  TECH STACK
                </h2>
                <div className="flex-1 h-[0.25mm] bg-[#C5A059]/40 ml-[1mm]" />
              </div>

              <div className="space-y-[1.0mm] text-[5.5pt] text-[#CBD5E1] pl-[1.2mm]">
                {techStack.map((tool, idx) => (
                  <div key={idx} className="flex items-start gap-[1.6mm] leading-tight">
                    <span className="w-[1.1mm] h-[1.1mm] bg-[#C5A059] mt-[0.8mm] shrink-0" />
                    <span>{tool}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SIDEBAR SECTION 4: LANGUAGES */}
            <div className="space-y-[1.2mm]">
              <div className="flex items-center gap-[1.6mm]">
                <span className="w-[1.6mm] h-[3.2mm] bg-[#C5A059] shrink-0" />
                <h2 className="text-[6.6pt] font-bold tracking-[0.18em] uppercase text-[#C5A059] font-sans">
                  LANGUAGES
                </h2>
                <div className="flex-1 h-[0.25mm] bg-[#C5A059]/40 ml-[1mm]" />
              </div>

              <div className="space-y-[1.0mm] text-[5.6pt] text-[#CBD5E1] pl-[1.2mm]">
                {languages.map((lang, idx) => (
                  <div key={idx} className="flex items-center gap-[1.6mm] leading-tight">
                    <span className="w-[1.1mm] h-[1.1mm] bg-[#C5A059] shrink-0" />
                    <span>{lang.name} — {lang.level}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SIDEBAR SECTION 5: CERTIFICATIONS */}
            <div className="space-y-[1.2mm]">
              <div className="flex items-center gap-[1.6mm]">
                <span className="w-[1.6mm] h-[3.2mm] bg-[#C5A059] shrink-0" />
                <h2 className="text-[6.6pt] font-bold tracking-[0.18em] uppercase text-[#C5A059] font-sans">
                  CERTIFICATIONS
                </h2>
                <div className="flex-1 h-[0.25mm] bg-[#C5A059]/40 ml-[1mm]" />
              </div>

              <div className="space-y-[1.0mm] text-[5.5pt] text-[#CBD5E1] pl-[1.2mm]">
                {certificationsList.map((cert, idx) => (
                  <div key={idx} className="flex items-start gap-[1.6mm] leading-tight">
                    <span className="w-[1.1mm] h-[1.1mm] bg-[#C5A059] mt-[0.8mm] shrink-0" />
                    <span>{cert}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SIDEBAR SECTION 6: INTERESTS */}
            <div className="space-y-[1.2mm]">
              <div className="flex items-center gap-[1.6mm]">
                <span className="w-[1.6mm] h-[3.2mm] bg-[#C5A059] shrink-0" />
                <h2 className="text-[6.6pt] font-bold tracking-[0.18em] uppercase text-[#C5A059] font-sans">
                  INTERESTS
                </h2>
                <div className="flex-1 h-[0.25mm] bg-[#C5A059]/40 ml-[1mm]" />
              </div>

              <div className="space-y-[1.0mm] text-[5.5pt] text-[#CBD5E1] pl-[1.2mm]">
                {interestsList.map((interest, idx) => (
                  <div key={idx} className="flex items-start gap-[1.6mm] leading-tight">
                    <span className="w-[1.1mm] h-[1.1mm] bg-[#C5A059] mt-[0.8mm] shrink-0" />
                    <span>{interest}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SIDEBAR SECTION 7: PERSONAL DETAILS */}
            <div className="space-y-[1.2mm]">
              <div className="flex items-center gap-[1.6mm]">
                <span className="w-[1.6mm] h-[3.2mm] bg-[#C5A059] shrink-0" />
                <h2 className="text-[6.6pt] font-bold tracking-[0.18em] uppercase text-[#C5A059] font-sans">
                  PERSONAL DETAILS
                </h2>
                <div className="flex-1 h-[0.25mm] bg-[#C5A059]/40 ml-[1mm]" />
              </div>

              <div className="space-y-[1.0mm] text-[5.6pt] text-[#CBD5E1] pl-[1.2mm] leading-tight">
                <div className="flex items-center gap-[1.6mm] leading-tight">
                  <span className="w-[1.1mm] h-[1.1mm] bg-[#C5A059] shrink-0" />
                  <p><span className="text-[#94A3B8]">Date of Birth: </span>{pDetails.dateOfBirth || '23/07/2002'}</p>
                </div>
                <div className="flex items-center gap-[1.6mm] leading-tight">
                  <span className="w-[1.1mm] h-[1.1mm] bg-[#C5A059] shrink-0" />
                  <p><span className="text-[#94A3B8]">Nationality: </span>{pDetails.nationality || 'Bangladeshi'}</p>
                </div>
                <div className="flex items-center gap-[1.6mm] leading-tight">
                  <span className="w-[1.1mm] h-[1.1mm] bg-[#C5A059] shrink-0" />
                  <p><span className="text-[#94A3B8]">Religion: </span>{pDetails.religion || 'Islam'}</p>
                </div>
                <div className="flex items-center gap-[1.6mm] leading-tight">
                  <span className="w-[1.1mm] h-[1.1mm] bg-[#C5A059] shrink-0" />
                  <p><span className="text-[#94A3B8]">Eligibility: </span>Global Remote / Contract</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* RIGHT MAIN COLUMN (Crisp White #FFFFFF, Width: 140mm / ~66.5%) */}
        {/* ========================================================= */}
        <main className="w-[140mm] min-w-[140mm] max-w-[140mm] h-full bg-[#FFFFFF] text-[#0E1626] p-[5.5mm] flex flex-col justify-between box-border overflow-hidden select-text relative">
          {/* Subtle Fixed Confidential Watermark Layer */}
          {watermarkConfig?.enabled !== false && (() => {
            const wmText = (watermarkConfig?.text || 'M R S • CONFIDENTIAL').toUpperCase();
            const tone = watermarkConfig?.tone || 'subtle-gold';
            const position = watermarkConfig?.position || 'diagonal-center';

            let colorClass = 'text-[#C5A059]/[0.08]';
            if (tone === 'extra-faint') colorClass = 'text-slate-400/[0.035]';
            else if (tone === 'subtle-slate') colorClass = 'text-slate-500/[0.075]';

            return (
              <div
                className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0 flex items-center justify-center"
                aria-hidden="true"
              >
                {position === 'triple-diagonal' ? (
                  <div className="flex flex-col gap-[48mm] items-center justify-center transform -rotate-[32deg]">
                    <span className={`font-sans font-extrabold tracking-[0.22em] text-[13pt] uppercase whitespace-nowrap ${colorClass}`}>
                      {wmText}
                    </span>
                    <span className={`font-sans font-extrabold tracking-[0.22em] text-[13pt] uppercase whitespace-nowrap ${colorClass}`}>
                      {wmText}
                    </span>
                    <span className={`font-sans font-extrabold tracking-[0.22em] text-[13pt] uppercase whitespace-nowrap ${colorClass}`}>
                      {wmText}
                    </span>
                  </div>
                ) : (
                  <div className="transform -rotate-[34deg]">
                    <span className={`font-sans font-extrabold tracking-[0.24em] text-[19pt] uppercase whitespace-nowrap ${colorClass}`}>
                      {wmText}
                    </span>
                  </div>
                )}

                {/* Top Right Confidential Micro-badge */}
                <div
                  className={`absolute top-[2.5mm] right-[5.5mm] text-[5pt] font-mono font-bold tracking-widest uppercase ${
                    tone === 'subtle-slate' ? 'text-slate-400' : 'text-[#C5A059]'
                  } opacity-90`}
                >
                  CONFIDENTIAL · OFFICIAL DOCUMENT
                </div>
              </div>
            );
          })()}

          <div className="space-y-[3.2mm] relative z-10">
            {/* MAIN SECTION 1: PROFILE */}
            <div className="space-y-[1.4mm]">
              <div className="flex items-center gap-[2.2mm]">
                <span className="w-[2.2mm] h-[4mm] bg-[#C5A059] shrink-0" />
                <h2 className="text-[9.2pt] font-bold tracking-[0.16em] uppercase text-[#0E1626] font-sans">
                  PROFILE
                </h2>
              </div>

              <div className="space-y-[1.4mm] text-[7pt] text-[#334155] leading-[1.42] pl-[0.5mm]">
                {liveCv.profileParagraphs.map((paragraph, pIdx) => (
                  <p key={pIdx}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* MAIN SECTION 2: WHAT I CAN HELP WITH */}
            <div className="space-y-[1.4mm]">
              <div className="flex items-center gap-[2.2mm]">
                <span className="w-[2.2mm] h-[4mm] bg-[#C5A059] shrink-0" />
                <h2 className="text-[9.2pt] font-bold tracking-[0.16em] uppercase text-[#0E1626] font-sans">
                  WHAT I CAN HELP WITH
                </h2>
              </div>

              <div className="space-y-[1.0mm] text-[6.8pt] text-[#334155] pl-[0.5mm]">
                {helpItems.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-[2mm] leading-tight">
                    <span className="w-[1.2mm] h-[1.2mm] bg-[#C5A059] mt-[0.8mm] shrink-0" />
                    <span className="font-medium text-[#1E293B]">{item}</span>
                  </div>
                ))}
                <p className="text-[6.5pt] italic text-[#64748B] pt-[0.4mm]">
                  {liveCv.availabilityNote}
                </p>
              </div>
            </div>

            {/* MAIN SECTION 3: WORK EXPERIENCE */}
            <div className="space-y-[1.4mm]">
              <div className="flex items-center gap-[2.2mm]">
                <span className="w-[2.2mm] h-[4mm] bg-[#C5A059] shrink-0" />
                <h2 className="text-[9.2pt] font-bold tracking-[0.16em] uppercase text-[#0E1626] font-sans">
                  WORK EXPERIENCE
                </h2>
              </div>

              <div className="space-y-[1.6mm] pl-[0.5mm]">
                {workExperience.map((exp, idx) => (
                  <div key={idx} className="space-y-[1mm]">
                    <div className="flex items-center justify-between">
                      <span className="text-[7.6pt] font-bold text-[#0E1626] font-sans">
                        {exp.role}
                      </span>
                      <span className="text-[6.6pt] font-sans text-[#64748B]">
                        {exp.period}
                      </span>
                    </div>
                    <p className="text-[6.6pt] italic text-[#A8843E] font-medium">
                      {exp.location}
                    </p>
                    <div className="space-y-[0.8mm] pt-[0.4mm]">
                      {exp.highlights.map((hl, hIdx) => (
                        <div key={hIdx} className="flex items-start gap-[2mm] leading-tight">
                          <span className="w-[1.1mm] h-[1.1mm] bg-[#C5A059] mt-[0.8mm] shrink-0" />
                          <p className="text-[6.8pt] text-[#475569] leading-tight flex-1">
                            {hl}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MAIN SECTION 4: DIGITAL PROJECTS (Real-time synchronized, strictly no website addresses) */}
            <div className="space-y-[1.4mm]">
              <div className="flex items-center gap-[2.2mm]">
                <span className="w-[2.2mm] h-[4mm] bg-[#C5A059] shrink-0" />
                <h2 className="text-[9.2pt] font-bold tracking-[0.16em] uppercase text-[#0E1626] font-sans">
                  DIGITAL PROJECTS
                </h2>
              </div>

              <div
                className={
                  digitalProjects.length > 4
                    ? 'grid grid-cols-2 gap-x-[4mm] gap-y-[1.4mm] pl-[0.5mm]'
                    : 'space-y-[1.6mm] pl-[0.5mm]'
                }
              >
                {digitalProjects.map((proj, idx) => (
                  <div key={`${proj.name}-${idx}`} className="space-y-[0.4mm]">
                    <div
                      className={
                        digitalProjects.length > 4
                          ? 'flex flex-col gap-[0.2mm]'
                          : 'flex items-center justify-between gap-[2mm]'
                      }
                    >
                      <span
                        className={
                          digitalProjects.length > 4
                            ? 'text-[7.0pt] font-bold text-[#0E1626] font-sans leading-tight truncate'
                            : 'text-[7.6pt] font-bold text-[#0E1626] font-sans'
                        }
                      >
                        {proj.name}
                      </span>
                      <span
                        className={
                          digitalProjects.length > 4
                            ? 'text-[5.5pt] font-bold uppercase tracking-wider text-[#A8843E] leading-tight truncate'
                            : 'text-[6.6pt] font-bold uppercase tracking-wider text-[#A8843E] shrink-0'
                        }
                      >
                        {proj.badge}
                      </span>
                    </div>
                    <div className="flex items-start gap-[1.6mm]">
                      <span className="w-[1.0mm] h-[1.0mm] bg-[#C5A059] mt-[0.8mm] shrink-0" />
                      <p
                        className={
                          digitalProjects.length > 4
                            ? 'text-[6.1pt] text-[#475569] leading-tight flex-1 line-clamp-2'
                            : 'text-[6.8pt] text-[#475569] leading-tight flex-1'
                        }
                      >
                        {proj.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MAIN SECTION 5: EDUCATION */}
            <div className="space-y-[1.4mm]">
              <div className="flex items-center gap-[2.2mm]">
                <span className="w-[2.2mm] h-[4mm] bg-[#C5A059] shrink-0" />
                <h2 className="text-[9.2pt] font-bold tracking-[0.16em] uppercase text-[#0E1626] font-sans">
                  EDUCATION
                </h2>
              </div>

              <div className="space-y-[1.6mm] pl-[0.5mm]">
                {educationList.map((edu, idx) => (
                  <div key={idx} className="space-y-[0.3mm]">
                    <div className="flex items-center justify-between">
                      <span className="text-[7.6pt] font-bold text-[#0E1626] font-sans">
                        {edu.degree}
                      </span>
                      <span className="text-[6.6pt] font-sans text-[#64748B]">
                        {edu.period}
                      </span>
                    </div>
                    <p className="text-[6.8pt] italic text-[#475569]">
                      {edu.institution} {edu.gpa ? `| ${edu.gpa}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Commitment Note */}
            <div className="pt-[1.5mm] border-t border-[#E2E8F0] text-[6.5pt] italic text-[#64748B] leading-tight">
              {liveCv.commitmentNote}
            </div>
          </div>

          {/* Clean Footer Timestamp */}
          <div className="pt-[1.5mm] border-t border-[#E2E8F0] flex items-center justify-between text-[5.5pt] text-[#94A3B8] font-sans">
            <span>Official Executive CV · Verified by M R S</span>
            <span>Synchronized {dateStr}</span>
          </div>
        </main>
      </div>
    </div>
  );
};
