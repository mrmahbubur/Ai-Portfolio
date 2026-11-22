import type { jsPDF } from 'jspdf';

interface FontConfig {
  filename: string;
  name: string;
  style: string;
  url: string;
}

const FONTS: FontConfig[] = [
  {
    filename: 'Outfit-Bold.ttf',
    name: 'Outfit',
    style: 'bold',
    url: 'https://fonts.gstatic.com/s/outfit/v15/QGYyz_MVcBeNP4NjuGObqx1XmO1I4deyC4E.ttf',
  },
  {
    filename: 'Outfit-Medium.ttf',
    name: 'Outfit',
    style: 'normal',
    url: 'https://fonts.gstatic.com/s/outfit/v15/QGYyz_MVcBeNP4NjuGObqx1XmO1I4QK1C4E.ttf',
  },
  {
    filename: 'InstrumentSans-Regular.ttf',
    name: 'InstrumentSans',
    style: 'normal',
    url: 'https://fonts.gstatic.com/s/instrumentsans/v4/pximypc9vsFDm051Uf6KVwgkfoSxQ0GsQv8ToedPibnr-yp2JGEJOH9npSTF-Qf1.ttf',
  },
  {
    filename: 'InstrumentSans-Bold.ttf',
    name: 'InstrumentSans',
    style: 'bold',
    url: 'https://fonts.gstatic.com/s/instrumentsans/v4/pximypc9vsFDm051Uf6KVwgkfoSxQ0GsQv8ToedPibnr-yp2JGEJOH9npSQi_gf1.ttf',
  },
  {
    filename: 'InstrumentSans-SemiBold.ttf',
    name: 'InstrumentSans',
    style: 'italic',
    url: 'https://fonts.gstatic.com/s/instrumentsans/v4/pximypc9vsFDm051Uf6KVwgkfoSxQ0GsQv8ToedPibnr-yp2JGEJOH9npSQb_gf1.ttf',
  },
];

// In-memory cache of Base64 encoded TTF files
const fontBase64Cache = new Map<string, string>();
let fontLoadingPromise: Promise<void> | null = null;

/**
 * Pre-fetches and caches custom TTF fonts for jsPDF (Outfit and Instrument Sans)
 */
export async function preloadPdfFonts(): Promise<void> {
  if (fontBase64Cache.size >= FONTS.length) {
    return;
  }

  if (fontLoadingPromise) {
    return fontLoadingPromise;
  }

  fontLoadingPromise = (async () => {
    try {
      await Promise.all(
        FONTS.map(async (f) => {
          if (fontBase64Cache.has(f.filename)) return;
          try {
            const res = await fetch(f.url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const arrayBuf = await res.arrayBuffer();

            // Convert arrayBuffer to base64
            let binary = '';
            const bytes = new Uint8Array(arrayBuf);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(arrayBuf).toString('base64');
            fontBase64Cache.set(f.filename, base64);
          } catch (e) {
            console.warn(`Could not load font ${f.filename}, falling back to system typography:`, e);
          }
        })
      );
    } catch (err) {
      console.warn('Error loading custom fonts for PDF:', err);
    } finally {
      fontLoadingPromise = null;
    }
  })();

  return fontLoadingPromise;
}

/**
 * Registers Outfit and Instrument Sans fonts with a jsPDF instance.
 * Returns font family names to use (custom or fallbacks).
 */
export async function applyCustomPdfFonts(doc: jsPDF): Promise<{
  headingFont: string;
  bodyFont: string;
  hasCustomFonts: boolean;
}> {
  await preloadPdfFonts();

  let registeredCount = 0;
  for (const f of FONTS) {
    const base64 = fontBase64Cache.get(f.filename);
    if (base64) {
      try {
        doc.addFileToVFS(f.filename, base64);
        doc.addFont(f.filename, f.name, f.style);
        registeredCount++;
      } catch (err) {
        console.warn(`Error registering ${f.filename} with jsPDF:`, err);
      }
    }
  }

  if (registeredCount >= 3) {
    return {
      headingFont: 'Outfit',
      bodyFont: 'InstrumentSans',
      hasCustomFonts: true,
    };
  }

  return {
    headingFont: 'helvetica',
    bodyFont: 'helvetica',
    hasCustomFonts: false,
  };
}
