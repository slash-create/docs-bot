export enum TimeStyle {
	/** hh:mm */
	SHORT_TIME = "t",
	/** hh:mm:ss */
	LONG_TIME = "T",
	/** dd/mm/yyyy */
	SHORT_DATE = "d",
	/** d Month YYYY */
	LONG_DATE = "D",
	/** d Month YYYY hh:mm */
	SHORT_FORMAT = "f",
	/** Day, d Month YYYY hh:mm */
	LONG_FORMAT = "F",
	/** in {n} / {n} ago */
	RELATIVE_TIME = "R",
}

export interface SharedCommandInfo {
	subCommands: string[];
	options: Record<string, any>;
	focused: string;
	focusedOption: any;
}