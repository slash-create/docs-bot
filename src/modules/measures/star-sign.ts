import { TIME } from "&common/constants";
import { FixedInterval } from "&common/fixed-interval";

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

  private static get year() {
    return new Date().getFullYear();
  }

  private year: number;

  static readonly #instances: StarSign[] = [];

  constructor(data: IStarSign, year?: number) {
    this.name = data.name;
    this.latin = data.latin;
    this.emoji = data.emoji;
    this.month = data.month;
    this.day = data.day;

    this.year = year ?? StarSign.year;
  }

  static #from(name: string, latin: string, emoji: string, month: number, day: number) {
    const instance = new StarSign({ name, latin, emoji, month, day });

    StarSign.#instances.push(instance);
    return instance;
  }

  private clone(year?: number) {
    return new StarSign(this, year);
  }

  public get instant() {
		return new Date(new Date().getFullYear(), this.month, this.day, 0, 0, 0, 0);
  }

  public get next() {
    const index = (this.month + 1) % StarSign.#total();

    return StarSign.#instances[index].clone(this.year + (+!index));
  }

  public nextOver(months: number) {
    let sign: StarSign = this;

    if (months < 0) return this.prevOver(-months);

    for (let i = 0; i < months; i++) {
      sign = sign.next;
    }

    return sign;
  }

	public isNextMonth(instant: Date | number): boolean {
		return new Date(instant).getMonth() === this.range.until.month;
	}

  public get prev() {
    const index = (this.month - 1 + StarSign.#total()) % StarSign.#total();

    return StarSign.#instances[index].clone(this.year - (+!this.month));
  }

  public prevOver(months: number) {
    let sign: StarSign = this;

    if (months < 0) return this.nextOver(-months);

    for (let i = 0; i < months; i++) {
      sign = sign.prev;
    }

    return sign;
  }

  public isPrevMonth(instant: Date | number): boolean {
		return new Date(instant).getMonth() === this.range.since.month;
	}

  public get range() {
    return {
      since: { month: this.prev.month, day: this.prev.day + 1 },
      until: { month: this.month, day: this.day }
    };
  }

  static #total() {
    return StarSign.#instances.length;
  }

  public static get instances() {
    return StarSign.#instances.slice();
  }

  public static find(query: string, key: 'name' | 'latin' | 'emoji' = 'name'): StarSign | undefined {
    return StarSign.#instances.find((value) => value[key] === query);
  }

  public static resolve(query: Date | number): StarSign {
    const date = new Date(query);
    const initial = StarSign.#instances[date.getMonth()];

    const instance = (date.getDate() > initial.day ? initial.next : initial)
    if (StarSign.year === date.getFullYear()) return instance;
    return instance.clone(date.getFullYear());
  }

  static {
    StarSign.#setupData();
    StarSign.#setupInterval();
  }

  static #setupData() {
    StarSign.#from('Capricornus', 'Goat', '♑', 0, 19); // Dec 22 - Jan 19
    StarSign.#from('Aquarius', 'Water Bearer', '♒', 1, 18); // Jan 20 - Feb 18
    StarSign.#from('Pisces', 'Fish', '♓', 2, 20); // Feb 19 - Mar 20
    StarSign.#from('Aries', 'Ram', '♈', 3, 19); // Mar 21 - Apr 19
    StarSign.#from('Taurus', 'Bull', '♉', 4, 20); // Apr 20 - May 20
    StarSign.#from('Gemini', 'Twins', '♊', 5, 21); // May 21 - Jun 21
    StarSign.#from('Cancer', 'Crab', '♋', 6, 22); // Jun 22 - Jul 22
    StarSign.#from('Leo', 'Lion', '♌', 7, 22); // Jul 23 - Aug 22
    StarSign.#from('Virgo', 'Virgin', '♍', 8, 22); // Aug 23 - Sep 22
    StarSign.#from('Libra', 'Balance', '♎', 9, 23); // Sep 23 - Oct 23
    StarSign.#from('Scorpius', 'Scorpion', '♏', 10, 21); // Oct 24 - Nov 21
    StarSign.#from('Sagittarius', 'Archer', '♐', 11, 21); // Nov 22 - Dec 21
  }

  static #interval: FixedInterval;

  static #setupInterval() {
    // Prevent running multiple intervals in test environment
    if (import.meta.main) return;

    StarSign.#interval = new FixedInterval(TIME.HOUR, 0, false, () => {
      // Update the year for all instances, when the new year while this deployment is running
      const currentYear = new Date().getFullYear();

      if (StarSign.year === currentYear) return;

      for (const sign of StarSign.#instances) {
        sign.year = currentYear;
      }
    })

    process.on('beforeExit', () => {
      StarSign.#interval.destroy();
    });
  }
}

export const allStarSigns = StarSign.instances;
export const findStarSign = StarSign.find;
export const resolveStarSign = StarSign.resolve;
