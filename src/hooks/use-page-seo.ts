import { useEffect } from 'react';

type PageSeoOptions = {
  title: string;
  description?: string;
};

function setMetaName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setMetaProperty(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Updates document title and key meta tags for SPA navigation (public pages). */
export function usePageSeo({ title, description }: PageSeoOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    if (description) {
      setMetaName('description', description);
      setMetaProperty('og:title', title);
      setMetaProperty('og:description', description);
      setMetaName('twitter:title', title);
      setMetaName('twitter:description', description);
    }

    return () => {
      document.title = prevTitle;
    };
  }, [title, description]);
}
