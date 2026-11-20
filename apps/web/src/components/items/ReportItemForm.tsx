'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Lock, MapPin, ShieldCheck } from 'lucide-react';
import { INDIAN_STATES_AND_UTS, ITEM_CATEGORIES, type ContactPreference, type ItemType } from '@lost-found/shared';

function getTodayInputValue(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function ReportItemForm() {
  const router = useRouter();

  const [type, setType] = useState<ItemType>('LOST');
  const [title, setTitle] = useState('');
  const [categorySlug, setCategorySlug] = useState<string>(ITEM_CATEGORIES[0].id);
  const [dateLostOrFound, setDateLostOrFound] = useState(getTodayInputValue);
  const [publicDescription, setPublicDescription] = useState('');
  const [privateDetails, setPrivateDetails] = useState('');
  const [contactPreference, setContactPreference] = useState<ContactPreference>('IN_APP');
  const [stateName, setStateName] = useState<string>('Delhi');
  const [city, setCity] = useState('');
  const [landmark, setLandmark] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [policeReportNumber, setPoliceReportNumber] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedCategory = ITEM_CATEGORIES.find((cat) => cat.id === categorySlug);
  const isSensitiveCategory = categorySlug === 'documents' || categorySlug === 'cards';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const payload = {
        type,
        title: title.trim(),
        categorySlug,
        dateLostOrFound: new Date(`${dateLostOrFound}T12:00:00.000Z`).toISOString(),
        publicDescription: publicDescription.trim(),
        ...(privateDetails.trim() ? { privateDetails: privateDetails.trim() } : {}),
        contactPreference,
        ...(policeReportNumber.trim() ? { policeReportNumber: policeReportNumber.trim() } : {}),
        location: {
          state: stateName,
          city: city.trim(),
          ...(landmark.trim() ? { landmark: landmark.trim() } : {}),
          ...(address.trim() ? { address: address.trim() } : {}),
          ...(postalCode.trim() ? { postalCode: postalCode.trim() } : {}),
        },
      };

      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        item?: { id: string };
        error?: { message?: string };
      };

      if (!response.ok || !data.item?.id) {
        setErrorMessage(
          data.error?.message || 'Unable to submit your report. Please review the form and try again.'
        );
        setSubmitting(false);
        return;
      }

      router.push(`/items/${data.item.id}?created=1`);
      router.refresh();
    } catch {
      setErrorMessage('Network error while submitting your report. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Please fix the following issue</p>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Report Type Selector */}
      <fieldset className="space-y-2.5">
        <legend className="text-sm font-semibold text-slate-900 dark:text-white">
          What are you reporting?
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('LOST')}
            aria-pressed={type === 'LOST'}
            className={`p-4 rounded-xl border text-left transition-all ${
              type === 'LOST'
                ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 ring-2 ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
            }`}
          >
            <span className="block text-sm font-bold text-slate-900 dark:text-white">
              I Lost an Item
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Publish a lost report so finders and institutions can match and contact you safely.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setType('FOUND')}
            aria-pressed={type === 'FOUND'}
            className={`p-4 rounded-xl border text-left transition-all ${
              type === 'FOUND'
                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
            }`}
          >
            <span className="block text-sm font-bold text-slate-900 dark:text-white">
              I Found an Item
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Keep identifying marks private so only the true owner can verify ownership.
            </span>
          </button>
        </div>
      </fieldset>

      {/* Item Basics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label
            htmlFor="item-title"
            className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5"
          >
            Item Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="item-title"
            type="text"
            required
            minLength={4}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === 'LOST'
                ? 'e.g., Black Samsung Galaxy Phone in Blue Case'
                : 'e.g., Brown Leather Wallet Found Near Metro Gate 2'
            }
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label
            htmlFor="item-category"
            className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5"
          >
            Category <span className="text-rose-500">*</span>
          </label>
          <select
            id="item-category"
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {ITEM_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {selectedCategory && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {selectedCategory.description}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="item-date"
            className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5"
          >
            Date {type === 'LOST' ? 'Lost' : 'Found'} <span className="text-rose-500">*</span>
          </label>
          <input
            id="item-date"
            type="date"
            required
            max={getTodayInputValue()}
            value={dateLostOrFound}
            onChange={(e) => setDateLostOrFound(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {isSensitiveCategory && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p>
            <strong>DPDP Privacy Guardrail:</strong> Never type full Aadhaar, PAN, Passport,
            Driving Licence, or Debit/Credit card numbers in the public description. Put only
            non-sensitive details publicly and place masked identifiers (such as the last 4 digits)
            in the private verification section below.
          </p>
        </div>
      )}

      {/* Public Description */}
      <div>
        <label
          htmlFor="public-description"
          className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5"
        >
          Public Description <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="public-description"
          required
          minLength={15}
          maxLength={1500}
          rows={4}
          value={publicDescription}
          onChange={(e) => setPublicDescription(e.target.value)}
          placeholder="Describe general appearance, brand, colour, and where/when it was lost or found. Avoid posting secret marks or personal phone/ID numbers."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Visible on public search results. Minimum 15 characters ({publicDescription.trim().length}/1500).
        </p>
      </div>

      {/* Private Verification Clues */}
      <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 space-y-2.5">
        <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
          <Lock className="w-4 h-4 shrink-0" />
          <label htmlFor="private-details" className="text-sm font-bold">
            Private Verification Clues (Never Shown Publicly)
          </label>
        </div>
        <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
          Add hidden details only the real owner would know—such as lock-screen wallpaper, inside
          pockets/stickers, engraving, or the last 4 digits of a serial/IMEI number. This field is
          strictly excluded from public search and API listings.
        </p>
        <textarea
          id="private-details"
          rows={3}
          maxLength={1000}
          value={privateDetails}
          onChange={(e) => setPrivateDetails(e.target.value)}
          placeholder="e.g., Lock screen shows golden retriever; small scratch near charging port; last 4 digits of serial: 4821."
          className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Location Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <MapPin className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold">Location in India</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="loc-state"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              State / Union Territory <span className="text-rose-500">*</span>
            </label>
            <select
              id="loc-state"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {INDIAN_STATES_AND_UTS.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="loc-city"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              City / District <span className="text-rose-500">*</span>
            </label>
            <input
              id="loc-city"
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., Bengaluru, New Delhi, Mumbai, Pune"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="loc-landmark"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Transit Hub / Campus / Landmark
            </label>
            <input
              id="loc-landmark"
              type="text"
              maxLength={150}
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g., Rajiv Chowk Metro Gate 3, Terminal 2"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="loc-pin"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              6-Digit Indian PIN Code
            </label>
            <input
              id="loc-pin"
              type="text"
              inputMode="numeric"
              pattern="[1-9][0-9]{5}"
              maxLength={6}
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="e.g., 110001"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="loc-address"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Area / Street Address (Optional)
            </label>
            <input
              id="loc-address"
              type="text"
              maxLength={255}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Optional public area name (avoid entering your home address)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Contact & Reference Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
        <div>
          <label
            htmlFor="contact-pref"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Preferred Recovery Channel
          </label>
          <select
            id="contact-pref"
            value={contactPreference}
            onChange={(e) => setContactPreference(e.target.value as ContactPreference)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="IN_APP">In-App Verified Claim Workflow (Recommended)</option>
            <option value="INSTITUTION_DESK">Institutional Lost &amp; Found Desk</option>
            <option value="EMAIL">Platform-Mediated Email Alert</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="police-ref"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Police Lost Report / GD Number (Optional)
          </label>
          <input
            id="police-ref"
            type="text"
            maxLength={80}
            value={policeReportNumber}
            onChange={(e) => setPoliceReportNumber(e.target.value)}
            placeholder="Optional e-Lost / police diary reference"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Every report gets a unique LFI reference number and audit trail.</span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white shadow-sm transition-colors"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Publishing Report...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit {type === 'LOST' ? 'Lost' : 'Found'} Report</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
