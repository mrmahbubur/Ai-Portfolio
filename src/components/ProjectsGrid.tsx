import React from 'react';
import { Project } from '../types';
import { ExternalLink, Layers, Tv, ShoppingBag, HeartHandshake, BookOpen, Globe, Volume2 } from 'lucide-react';

interface ProjectsGridProps {
  projects?: Project[];
  activeTourProjectId?: string | null;
  activeTourIndex?: number | null;
  onProjectClick?: (project: Project) => void;
  onAskProject?: (project: Project) => void;
  onProjectHover?: (project: Project) => void;
}

export const ProjectsGrid: React.FC<ProjectsGridProps> = ({
  projects = [],
  activeTourProjectId,
  activeTourIndex,
  onProjectClick,
  onAskProject,
  onProjectHover,
}) => {
  const safeProjects = Array.isArray(projects) ? projects : [];

  const handleCardClick = (project: Project) => {
    if (onProjectClick) onProjectClick(project);
    else if (onAskProject) onAskProject(project);
  };
  // Helper for project icon
  const getProjectIcon = (id: string) => {
    switch (id) {
      case 'proj-hub':
        return <Globe className="w-4 h-4 text-[var(--gold)]" />;
      case 'proj-blog':
        return <BookOpen className="w-4 h-4 text-[var(--gold)]" />;
      case 'proj-iptv':
        return <Tv className="w-4 h-4 text-[var(--gold)]" />;
      case 'proj-store':
        return <ShoppingBag className="w-4 h-4 text-[var(--gold)]" />;
      case 'proj-charity':
        return <HeartHandshake className="w-4 h-4 text-[var(--gold)]" />;
      default:
        return <Layers className="w-4 h-4 text-[var(--gold)]" />;
    }
  };

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--gold)]">
            <Layers className="w-3.5 h-3.5 text-[var(--gold)]" />
            <span>Featured Ventures</span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl text-[var(--text)] font-bold tracking-tight mt-1">
            Projects &amp; Digital Hubs
          </h2>
        </div>
        <p className="text-xs font-mono text-[var(--text-muted)]">
          Hover or tap any card for Camellia (M R S Assistant)’s spoken overview
        </p>
      </div>

      {/* Grid of 5 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {safeProjects.map((project, index) => {
          const isTourActive =
            activeTourProjectId === project.id ||
            (activeTourIndex !== null && activeTourIndex !== undefined && index === activeTourIndex);
          return (
            <div
              key={`${project.id || 'proj'}-${index}`}
              id={`project-card-${project.id || index}`}
              onClick={() => handleCardClick(project)}
              onMouseEnter={() => onProjectHover && onProjectHover(project)}
              className={`relative flex flex-col justify-between p-5 rounded-2xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.985] cursor-pointer group touch-manipulation ${
                isTourActive
                  ? 'bg-[var(--panel-hover)] scale-[1.02] ring-1 ring-[var(--gold)]/40 shadow-lg'
                  : 'bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] hover:-translate-y-1 hover:shadow-md'
              }`}
            >
              {/* Card Number Index & Category */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[var(--panel)]">
                      {getProjectIcon(project.id)}
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                      0{index + 1} &bull; {project.category}
                    </span>
                  </div>

                  {project.badge && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider font-semibold bg-[var(--gold)]/10 text-[var(--gold)]">
                      {project.badge}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-heading text-base sm:text-lg text-[var(--text)] font-semibold mb-2 group-hover:text-[var(--gold)] transition-colors">
                  {project.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans mb-4">
                  {project.description}
                </p>
              </div>

              {/* Tags and Action */}
              <div>
                <div className="flex flex-wrap items-center gap-1.5 mb-4 font-mono text-[11px] text-[var(--text-muted)]">
                  {(project.tags || []).map((tag, tagIdx) => (
                    <React.Fragment key={tag}>
                      {tagIdx > 0 && <span aria-hidden="true">·</span>}
                      <span>{tag}</span>
                    </React.Fragment>
                  ))}
                </div>

                <div className="pt-3 flex items-center justify-between">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[var(--gold)] hover:underline cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3 text-[var(--gold)]" />
                    <span>Narrate Card</span>
                  </button>

                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors"
                    >
                      <span>Visit</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Active Tour Indicator Banner */}
              {isTourActive && (
                <div className="absolute -top-3 left-4 px-2.5 py-0.5 rounded bg-[var(--gold)] text-[var(--gold-ink)] font-mono text-[10px] font-bold tracking-wide shadow-md">
                  Active Tour Focus
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
