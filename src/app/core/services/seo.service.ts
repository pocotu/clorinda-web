import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

/** SEO metadata contract — every public page provides this. */
export interface PageSeoConfig {
  /** Full page title shown in browser tab and Google results */
  title: string;
  /** 150-160 char description for SERP snippet */
  description: string;
  /** Comma-separated keywords relevant to this page */
  keywords: string;
  /** Canonical URL path, e.g. '/nosotros' */
  canonicalPath: string;
  /** JSON-LD structured-data object (optional) */
  jsonLd?: Record<string, unknown>;
}

/** Base URL used for Open Graph and canonical tags. */
const BASE_URL = 'https://clorindamattodeturner.edu.pe';

/** Default Open Graph image for social sharing. */
const OG_IMAGE = `${BASE_URL}/assets/images/logo.png`;

/**
 * SeoService — Single Responsibility: manages all SEO concerns.
 *
 * Usage:
 *   inject(SeoService).setPage({ title, description, keywords, canonicalPath, jsonLd });
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /**
   * Apply full SEO configuration for the current page.
   * Call this in ngOnInit of each public component.
   */
  setPage(config: PageSeoConfig): void {
    this.setTitle(config.title);
    this.setMeta(config);
    this.setCanonical(config.canonicalPath);
    if (config.jsonLd) {
      this.setJsonLd(config.jsonLd);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────

  private setTitle(title: string): void {
    this.titleService.setTitle(title);
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ name: 'twitter:title', content: title });
  }

  private setMeta(config: PageSeoConfig): void {
    const { description, keywords, canonicalPath } = config;
    const url = `${BASE_URL}${canonicalPath}`;

    // Standard
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'keywords', content: keywords });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });

    // Open Graph
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: OG_IMAGE });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:locale', content: 'es_PE' });
    this.meta.updateTag({
      property: 'og:site_name',
      content: 'IE Emblemática Clorinda Matto de Turner',
    });

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: OG_IMAGE });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
  }

  private setCanonical(path: string): void {
    const url = `${BASE_URL}${path}`;
    let link: HTMLLinkElement | null = this.document.querySelector("link[rel='canonical']");
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setJsonLd(data: Record<string, unknown>): void {
    const id = 'json-ld-structured-data';
    let script: HTMLScriptElement | null = this.document.getElementById(id) as HTMLScriptElement;
    if (!script) {
      script = this.document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }
}
