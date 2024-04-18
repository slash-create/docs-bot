export interface DocumentationRoot {
  classes: ClassDescriptor[];
  custom: /* CustomEntry */ any[];
  meta: DocumentationMeta;
  typedefs: TypeDescriptor[];
}

export interface DocumentationMeta {
  version: string;
  format: number;
  date: number;
}

export interface ClassDescriptor {
  construct: ClassConstructor;
  events: EventDescriptor[];
  description: string;
  extends: string[];
  meta: FileMeta;
  methods: MethodDescriptor[];
  name: string;
  props: MemberDescriptor[];
}

export interface EventDescriptor {
  description: string;
  emits: [];
  examples: [];
  meta: FileMeta;
  name: string;
  params: ParameterDescriptor[];
  returns: string[][][];
  see: string[];
}

export interface ClassConstructor {
  meta: FileMeta;
  name: string;
  params: ParameterDescriptor[];
  returns: string[][][]; // there's something that goes on here that i cannot explain, some resolve to descriptors - others are symbols describing siblings as generics
}

export interface FileMeta {
  file: string;
  line: number;
  path: string;
}

export interface MethodDescriptor {
  deprecated: boolean;
  description: string;
  access?: "private";
  emits: []; // unknown
  examples: []; // unknown
  meta: FileMeta;
  name: string;
  params: ParameterDescriptor[];
  returns: string[][][];
  see: string[];
}

export interface MemberDescriptor {
  description: string;
  meta: FileMeta;
  name: string;
  readonly: boolean;
  type: string[][][];
}

export interface ParameterDescriptor {
  default: string;
  description: string;
  name: string;
  optional: boolean;
  type: string[][][];
}

export interface TypeDescriptor {
  access?: "private";
  description?: string;
  meta: FileMeta;
  name: string;
  see: [];
  props?: MemberDescriptor[];
  params?: ParameterDescriptor[];
  returns?: string[][][];
  type?: string[][][];
}

export enum TypeSymbol {
  method = "#",
  prop = "~",
  event = "$",
}

export enum TypeSource {
  method = "method",
  prop = "prop",
  event = "event",
}

export enum TypeRoute {
  method = "methods",
  prop = "props",
  event = "events",
}

export interface TypeOutcome {
  method: MethodDescriptor;
  prop: MemberDescriptor;
  event: EventDescriptor;
}

export type AnyParentDescriptor = ClassDescriptor | TypeDescriptor;
export type AnyStructureDescriptor =
  | ChildStructureDescriptor
  | AnyParentDescriptor;
/**
 * TypeDescriptor can be a callable entity in rare cases (type Callback = (a: string) => void;), but it's not a class.
 * <Descriptor>.params is used if <Descriptor>.type is not present (for TypeDescriptor only).
 */
export type CallableDescriptor =
  | MethodDescriptor
  | EventDescriptor
  | ClassConstructor
  | TypeDescriptor;
export type ChildStructureDescriptor =
  | MethodDescriptor
  | MemberDescriptor
  | EventDescriptor;
