// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Vorrapong Kertnat';
export const SITE_DESCRIPTION =
	'Full-stack developer in Bangkok writing about TypeScript, ElysiaJS, DevSecOps, and a slow pivot into financial engineering.';
export const CONTACT_EMAIL = 'k.vorrapong@gmail.com';

// Replace with the GA4 Web Stream ID (G-XXXXXXXXXX). Blank keeps analytics disabled.
export const GA_MEASUREMENT_ID = 'G-B0BZXW6R4M';

// Token from Search Console > Add property > URL prefix > HTML tag.
// Blank omits the meta tag entirely.
export const GOOGLE_SITE_VERIFICATION = 'x56mQXNIg5MfMKQQsYB5JK2htMm2yyc-hP1hN9SXnxY';

// The author as an entity: the Person JSON-LD, the article bylines and the
// rel="me" links all read from here, so the identity Google sees is one record.
export const AUTHOR = {
	name: SITE_TITLE,
	alternateName: 'ICE',
	jobTitle: 'Full-stack developer',
	employer: 'Bank for Agriculture and Agricultural Cooperatives (BAAC)',
	university: 'Prince of Songkla University',
	location: 'Bangkok, Thailand',
} as const;

// Profiles that already rank for the author's name. Listed as sameAs so the
// search engines tie this site to the entity they already know.
export const SOCIAL_LINKS = {
	github: 'https://github.com/iceman951',
	linkedin: 'https://www.linkedin.com/in/vorrapong/',
	medium: 'https://medium.com/@iceman951',
	credly: 'https://www.credly.com/users/vorrapong-kertnat/badges',
} as const;
