// #region Aggregator Types

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
  navigatorCount: number;
  latest: string;
  lastFetch: number;
  readonly lastFetchAt: Date;
}

// #endregion

// #region Navigator Types

export interface DocumentationRoot {
  classes: ClassDescriptor[];
  custom: /* CustomEntry */ any[];
  meta: DocumentationMeta;
  typedefs: TypeDescriptor[];
}

export interface DocumentationFile {
  file: string;
  line: number;
  path: string;
}

export interface DocumentationMeta {
  version: string;
  format: number;
  date: number;
}

export interface BaseDescriptor<Species, Parent = undefined> {
  name: string;
  meta: DocumentationFile;

  is(query: string | Species): query is Species;
  toString(): string;
  readonly parent: Parent;
  readonly [Symbol.species]: Species;
  readonly species: Species;
}

export interface ClassDescriptor extends BaseDescriptor<'class'> {
  construct: ConstructorDescriptor;
  events: EventDescriptor[];
  description: string;
  extends: string[];
  methods: MethodDescriptor[];
  props: MemberDescriptor[];
}

export interface ConstructorDescriptor extends BaseDescriptor<'method', ClassDescriptor> {
  params: ParameterDescriptor[];
  returns: TypeString;
}

export interface EventDescriptor extends BaseDescriptor<'event', ClassDescriptor> {
  description: string;
  emits: [];
  examples: [];
  params: ParameterDescriptor[];
  returns: TypeString;
  see: string[];
}

export interface MethodDescriptor extends BaseDescriptor<'method', ClassDescriptor> {
  deprecated: boolean;
  description: string;
  access?: 'private';
  emits: [];
  examples: [];
  params: ParameterDescriptor[];
  returns: TypeString;
  see: string[];
}

export interface MemberDescriptor extends BaseDescriptor<'member', AnyStructureDescriptor> {
  description?: string;
  readonly: boolean;
  type?: TypeString;
}

export interface ParameterDescriptor extends BaseDescriptor<never, AnyCallableDescriptor> {
  default?: string;
  description?: string;
  optional: string;
  type?: TypeString;
}

export interface TypeDescriptor extends BaseDescriptor<'typedef'> {
  access?: 'private';
  description?: string;
  see: [];
  props?: MemberDescriptor[];
  params?: ParameterDescriptor[];
  returns?: TypeString;
  type?: TypeString;
}

export const enum TypeSymbol {
  Event = '$',
  events = '$', // alias
  Method = '#',
  methods = '#', // alias
  Member = '~',
  props = '~' // alias
}

export type AnyDescriptor = AnyStructureDescriptor | AnyChildDescriptor;

export type AnyStructureDescriptor = ClassDescriptor | TypeDescriptor;

export type AnyChildDescriptor = ConstructorDescriptor | MethodDescriptor | EventDescriptor | MemberDescriptor;

/**
 * TypeDescriptor can be a callable entity in rare cases (type Callback = (a: string) => void;), but it's not a class.
 * <Descriptor>.params is used if <Descriptor>.type is not present (for TypeDescriptor only).
 */
export type AnyCallableDescriptor = ConstructorDescriptor | TypeDescriptor | MethodDescriptor | EventDescriptor;

/**
 * Includes the angle brackets (`<`, `>`) and any references to types available within the resolver.
 *
 * There's something that goes on here that I cannot explain.
 * Some resolve to descriptors - others are symbols or external types.
 */
export type TypeString = string[][][];

// #endregion
