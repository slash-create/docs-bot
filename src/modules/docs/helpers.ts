import type { TypeNavigator } from "./navigator";
import type {
	AnyChildDescriptor,
	AnyDescriptor,
	DocumentationFile,
	ParameterDescriptor,
} from "./types";

export function getSymbol(type: string) {
	switch (type.toLowerCase()) {
		case "event":
		case "events":
			return "$";
		case "method":
		case "methods":
			return "#";
		case "member":
		case "members":
		case "prop":
		case "props":
			return "~";
		default:
			return null;
	}
}

export function defineCommon(
	navigator: TypeNavigator,
	type: string,
	parent: AnyDescriptor,
	child?: AnyChildDescriptor,
	symbol?: string,
): AnyDescriptor {
	if (child) {
		Reflect.defineProperty(child, "parent", {
			get() {
				return parent;
			},
		});
	}

	const focus = child ?? parent;

	Object.assign(focus, {
		toString() {
			return ("parent" in this ? this.parent.name + symbol : "") + this.name;
		},
		get [Symbol.species]() {
			return type;
		},
		get species() {
			return type;
		},
		get navigator() {
			return navigator;
		},
		is(this: AnyDescriptor, query: string) {
			return this.species === query;
		},
	});

	if (focus.meta) {
		Reflect.set(focus.meta, "toString", function (this: DocumentationFile) {
			return `${this.path}/${this.file}#L${this.line}`;
		});
	} else {
		Reflect.set(focus, "meta", {
			toString(this: AnyDescriptor) {
				return this.parent.meta.toString();
			},
		});
	}

	if ("params" in focus) {
		focus.params.forEach((param, index) => {
			Object.assign(param, {
				toString(this: ParameterDescriptor) {
					return (
						`${this.parent.parent.name +
						symbol +
						this.parent.name}([${index}]${this.name})`
					);
				},
				get [Symbol.species]() {
					return "param";
				},
				get species() {
					return "param";
				},
				is(this: ParameterDescriptor, query: string) {
					return this.species === query;
				},
				get navigator() {
					return navigator;
				},
			});
		});
	}

	return focus;
}
