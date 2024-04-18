export interface IStarSign {
  name: string;
  latin: string;
  emoji: string;
  month: number;
  day: number;
}

class StarSign implements IStarSign {
  public readonly name: string;
  public readonly latin: string;
  public readonly emoji: string;
  public readonly month: number;
  public readonly day: number;

  private constructor(data: IStarSign) {
    this.name = data.name;
    this.latin = data.latin;
    this.emoji = data.emoji;
    this.month = data.month;
    this.day = data.day;

    StarSign.#instances.push(this);
  }

  static #from(
    name: string,
    latin: string,
    emoji: string,
    month: number,
    day: number,
  ) {
    return new StarSign({ name, latin, emoji, month, day });
  }

  get #index() {
    return StarSign.#instances.indexOf(this);
  }

  public get next() {
    return StarSign.#instances[(this.#index + 1) % StarSign.#total];
  }

  public get prev() {
    return StarSign.#instances[
      (this.#index === 0 ? StarSign.#total : this.#index) - 1
    ];
  }

  public get instant() {
    return new Date(new Date().getFullYear(), this.month, this.day, 0, 0, 0, 0);
  }

  public isPrevMonth(instant: Date | number): boolean {
    return new Date(instant).getMonth() === this.range.since.month;
  }

  public isNextMonth(instant: Date | number): boolean {
    return new Date(instant).getMonth() === this.range.until.month;
  }

  public offsetOf(instant: Date | number): number {
    return this.instant.valueOf() - instant.valueOf();
  }

  public get range() {
    return {
      since: {
        month: this.prev.month,
        day: this.prev.day + 1,
        instant: this.prev.instant,
      },
      until: { month: this.month, day: this.day, instant: this.instant },
    };
  }

  // Static

  static readonly #instances: StarSign[] = [];

  static get #total() {
    return StarSign.#instances.length;
  }

  public static get instances() {
    return StarSign.#instances.slice();
  }

  public static find(
    query: string,
    key: "name" | "latin" | "emoji" = "name",
  ): StarSign | undefined {
    return StarSign.#instances.find((value) => value[key] === query);
  }

  public static resolve(query: Date | number): StarSign {
    const date = new Date(query);
    const initial = StarSign.#instances[date.getMonth()];

    return date.getDate() > initial.day ? initial.next : initial;
  }

  static {
    StarSign.#from("Capricornus", "Goat", "♑", 0, 19); // Dec 22 - Jan 19
    StarSign.#from("Aquarius", "Water Bearer", "♒", 1, 18); // Jan 20 - Feb 18
    StarSign.#from("Pisces", "Fish", "♓", 2, 20); // Feb 19 - Mar 20
    StarSign.#from("Aries", "Ram", "♈", 3, 19); // Mar 21 - Apr 19
    StarSign.#from("Taurus", "Bull", "♉", 4, 20); // Apr 20 - May 20
    StarSign.#from("Gemini", "Twins", "♊", 5, 21); // May 21 - Jun 21
    StarSign.#from("Cancer", "Crab", "♋", 6, 22); // Jun 22 - Jul 22
    StarSign.#from("Leo", "Lion", "♌", 7, 22); // Jul 23 - Aug 22
    StarSign.#from("Virgo", "Virgin", "♍", 8, 22); // Aug 23 - Sep 22
    StarSign.#from("Libra", "Balance", "♎", 9, 23); // Sep 23 - Oct 23
    StarSign.#from("Scorpius", "Scorpion", "♏", 10, 21); // Oct 24 - Nov 21
    StarSign.#from("Sagittarius", "Archer", "♐", 11, 21); // Nov 22 - Dec 21
  }
}

export const allStarSigns = StarSign.instances;
export const findStarSign = StarSign.find;
export const resolveStarSign = StarSign.resolve;
