import { FileMeta } from './metaTypes';

export const BRANCH = `master`; // possiblity to add branch support further in, but i wouldn't see much point if discord keeps changing stuff...
export const BASE_DOCS_URL = `https://slash-create.js.org/#/docs/main/${BRANCH}`;
export const REMOTE_LOCATION = `Snazzah/slash-create`;

export function buildDocsLink(calledType: string, entity: string, scrollTo?: string) {
  return `${BASE_DOCS_URL}/${calledType}/${entity}${scrollTo ? `?scrollTo=${scrollTo}` : ''}`;
}

export function buildGitHubLink(fileMeta: FileMeta) {
  return `https://github.com/${REMOTE_LOCATION}/blob/${BRANCH}/${fileMeta.path}/${fileMeta.file}#L${fileMeta.line}`;
}

export const rawContentLink = `https://raw.githubusercontent.com/${REMOTE_LOCATION}/${BRANCH}`;
