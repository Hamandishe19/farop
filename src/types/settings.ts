export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export interface OpeningHours {
  /** Free text, e.g. "Monday, Wednesday & Thursday". */
  days: string;
  /** Free text, e.g. "06:00 – 21:00" or "Closed". */
  time: string;
}

/**
 * Business details shown across the website and editable by supreme and
 * developer admins. Anything left undefined is hidden on the site.
 */
export interface BusinessSettings {
  /** WhatsApp number, digits only in international format (e.g. "263774773122"). */
  whatsapp?: string;
  /** Phone number as it should be displayed. */
  phone?: string;
  email?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  /** EcoCash number as customers should dial it. */
  ecocashNumber?: string;
  deliveryDays: Weekday[];
  hours: OpeningHours[];
}
