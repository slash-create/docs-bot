import { FileMeta } from './metaTypes';

export const BRANCH = `master`; // possiblity to add branch support further in, but i wouldn't see much point if discord keeps changing stuff...
export const BASE_DOCS_URL = `https://slash-create.js.org/#/docs/main/${BRANCH}`;
export const BASE_GITHUB_URL = `https://github.com/Snazzah/slash-create/blob/${BRANCH}`;

export function buildDocsLink(calledType: string, entity: string, scrollTo: string) {
  return `${BASE_DOCS_URL}/${calledType}/${entity}${scrollTo ? `?scrollTo=${scrollTo}` : ''}`;
}

export function buildGitHubLink(fileMeta: FileMeta) {
  return `${BASE_GITHUB_URL}/${fileMeta.path}/${fileMeta.file}#L${fileMeta.line}`;
}
