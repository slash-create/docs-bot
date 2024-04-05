export interface GitTreeBranchResponse {
  sha: string;
  url: string;
  tree: GitTreeNode[];
}

export interface GitTreeNode {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size: number;
  url: string;
}

export interface AggregatorInformation {
  ready: boolean;
  versions: number;
  branches: number;
  latest: string;
  lastFetch: number;
  readonly lastFetchAt: Date;
}
