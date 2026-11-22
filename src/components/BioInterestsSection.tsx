import React, { useState } from 'react';
import { BioProfile } from '../types';
import { Award, CheckCircle2, Cpu, Globe, Terminal, Users, Sparkles, Volume2, ChevronDown, ChevronUp } from 'lucide-react';

interface BioInterestsSectionProps {
  profile: BioProfile;
  onAskTopic: (prompt: string, title: string) => void;
}

export const BioInterestsSection: React.FC<BioInterestsSectionProps> = ({
  profile,
  onAskTopic,
}) => {
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const bioExcerpt = profile.gravatarBio
    ? profile.gravatarBio.length > 280 && !isBioExpanded
      ? profile.gravatarBio.slice(0, 280) + '...'
      : profile.gravatarBio
    : profile.aboutDetails;

  return (
    <div className="w-full space-y-8">
      {/* Bio Overview Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[var(--panel-raised)] shadow-[var(--shadow-card)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--gold)]">
            <Award className="w-4 h-4 text-[var(--gold)]" />
            <span>Verified Biography</span>
          </div>

          <span className="text-xs font-mono text-[var(--text-muted)]">
            Certificates &amp; academic credentials preserved in downloadable CV (PDF)
          </span>
        </div>

        {/* Editorial Lead Quote */}
        <p className="font-heading text-lg sm:text-xl text-[var(--text)] leading-relaxed mb-4">
          “{bioExcerpt}”
        </p>

        {profile.gravatarBio && profile.gravatarBio.length > 280 && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setIsBioExpanded(!isBioExpanded)}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--gold)] hover:text-[var(--gold-hover)] transition-colors cursor-pointer"
            >
              <span>{isBioExpanded ? 'See Less' : 'See More'}</span>
              {isBioExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Detailed Narrative */}
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-sans mb-6">
          {profile.aboutDetails}
        </p>

        {/* Key Competency Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div className="p-4 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)]">
            <span className="block font-mono text-[11px] font-medium text-[var(--gold)] mb-1">
              IT Administration
            </span>
            <span className="text-xs text-[var(--text)]">
              Microsoft 365, Document Management, Correspondence
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)]">
            <span className="block font-mono text-[11px] font-medium text-[var(--gold)] mb-1">
              Web &amp; Content Operations
            </span>
            <span className="text-xs text-[var(--text)]">
              WordPress, Blogspot CMS, Media Streaming &amp; Stores
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)]">
            <span className="block font-mono text-[11px] font-medium text-[var(--gold)] mb-1">
              Remote Autonomy
            </span>
            <span className="text-xs text-[var(--text)]">
              Independent execution, client communication, continuous learning
            </span>
          </div>
        </div>
      </div>

      {/* Interests Row */}
      <div className="p-6 rounded-2xl bg-[var(--panel-raised)] shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 font-mono text-xs text-[var(--gold)] mb-2">
          <Sparkles className="w-4 h-4 text-[var(--gold)]" />
          <span>Core Interests &amp; Domains</span>
        </div>

        <h3 className="font-heading text-xl text-[var(--text)] font-semibold mb-4">
          Areas of Focus &amp; Continuous Research
        </h3>

        <div className="flex flex-wrap gap-2.5">
          {(profile?.interests || []).map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() =>
                onAskTopic(
                  `Tell me about M R S's focus and interest in ${interest}.`,
                  `Interest: ${interest}`
                )
              }
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-hover)] shadow-[var(--shadow-card)] text-xs font-mono text-[var(--text)] transition-all cursor-pointer"
            >
              <span>{interest}</span>
              <Volume2 className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--gold)]" />
            </button>
          ))}
        </div>
      </div>

      {/* Skills Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(profile?.skillsList || []).map((skillGroup, groupIdx) => (
          <div
            key={skillGroup.category || `group-${groupIdx}`}
            className="p-5 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)]"
          >
            <h4 className="font-heading text-sm text-[var(--gold)] mb-3 font-semibold">
              {skillGroup.category}
            </h4>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              {(skillGroup.skills || []).map((skill, sIdx) => (
                <React.Fragment key={skill}>
                  {sIdx > 0 && <span className="mx-2 text-[var(--gold)] font-mono" aria-hidden="true">·</span>}
                  <span className="text-[var(--text)] font-medium">{skill}</span>
                </React.Fragment>
              ))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
