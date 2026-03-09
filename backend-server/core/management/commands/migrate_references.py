"""
Migrate MechanismReference rows from 'Anecdotal/Interviews' and
'Legislative/Timeline' categories into the new MechanismQuote and
MechanismTimelineEntry models.

Usage:
    python manage.py migrate_references          # dry run (default)
    python manage.py migrate_references --apply  # actually migrate + delete old rows
"""

import re
from datetime import date

from django.core.management.base import BaseCommand

from core.models import MechanismQuote, MechanismReference, MechanismTimelineEntry


def parse_quote(description: str):
    """Extract speaker and timestamp from an interview quote description.

    Common patterns:
      "quote text" - Robert Hall at 6:11
      "quote text" -Charlese Jackson at 3:58 to 5:06
      [bracketed intro] "quote" - Speaker at timestamp
    """
    # Try to match attribution at the end: - Speaker at timestamp
    match = re.match(
        r'^([\s\S]*?["\u201D\u2019\'])\s*[-\u2014]\s*(.+?)(?:\s+at\s+(.+))?$',
        description.strip(),
    )
    if match:
        quote_text = match.group(1).strip()
        speaker = match.group(2).strip()
        timestamp = (match.group(3) or "").strip()
        # Clean up speaker — remove trailing "at" if timestamp wasn't captured separately
        # e.g. "Robert Hall at 6:11" where the whole thing matched as speaker
        at_match = re.match(r'^(.+?)\s+at\s+(.+)$', speaker)
        if at_match:
            speaker = at_match.group(1).strip()
            timestamp = at_match.group(2).strip()
        return quote_text, speaker, timestamp

    # Fallback: no attribution found, use full text as quote
    return description.strip(), "", ""


def parse_timeline_date(description: str):
    """Try to extract a year from a timeline entry description.

    Looks for patterns like (2018), (1994), 2006, 2017, etc.
    Returns (date, title) where date is Jan 1 of the extracted year,
    and title is a short label extracted from the beginning.
    """
    # Look for a year in parentheses first: (2018), (1994)
    paren_match = re.search(r'\((\d{4})\)', description)
    if paren_match:
        year = int(paren_match.group(1))
        # Try to extract a title before the year
        title = description[:paren_match.end()].strip()
        # Clean up common patterns
        title = re.sub(r'\s*[-\u2014:]\s*$', '', title).strip()
        return date(year, 1, 1), title

    # Look for "Month YYYY" at the start
    month_match = re.match(
        r'^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})',
        description,
        re.IGNORECASE,
    )
    if month_match:
        months = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4,
            'may': 5, 'june': 6, 'july': 7, 'august': 8,
            'september': 9, 'october': 10, 'november': 11, 'december': 12,
        }
        month = months[month_match.group(1).lower()]
        year = int(month_match.group(2))
        return date(year, month, 1), description[:month_match.end()].strip()

    # Look for a bare year near the start
    year_match = re.search(r'\b(1[6-9]\d{2}|20\d{2})\b', description[:80])
    if year_match:
        year = int(year_match.group(1))
        title = description[:year_match.end()].strip()
        title = re.sub(r'\s*[-\u2014:]\s*$', '', title).strip()
        return date(year, 1, 1), title

    # No date found
    title = description[:60].strip()
    if len(description) > 60:
        title = title.rsplit(' ', 1)[0] + "..."
    return None, title


class Command(BaseCommand):
    help = "Migrate Anecdotal/Interviews and Legislative/Timeline references to new models"

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually create new records and delete old references (default is dry run)",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        mode = "APPLYING" if apply else "DRY RUN"
        self.stdout.write(f"\n=== {mode} ===\n")

        # --- Quotes ---
        quote_refs = MechanismReference.objects.filter(category="Anecdotal/Interviews")
        self.stdout.write(f"\nAnecdotal/Interviews: {quote_refs.count()} references\n")

        quotes_created = 0
        for ref in quote_refs:
            quote_text, speaker, timestamp = parse_quote(ref.description)
            self.stdout.write(f"  [{ref.mechanism.name}]")
            self.stdout.write(f"    Speaker:   {speaker or '(none)'}")
            self.stdout.write(f"    Timestamp: {timestamp or '(none)'}")
            self.stdout.write(f"    Quote:     {quote_text[:80]}...")
            self.stdout.write("")

            if apply:
                MechanismQuote.objects.create(
                    mechanism=ref.mechanism,
                    speaker=speaker,
                    quote=quote_text,
                    source_timestamp=timestamp,
                    link=ref.link,
                )
                ref.delete()
                quotes_created += 1

        # --- Timeline ---
        timeline_refs = MechanismReference.objects.filter(category="Legislative/Timeline")
        self.stdout.write(f"\nLegislative/Timeline: {timeline_refs.count()} references\n")

        timeline_created = 0
        for ref in timeline_refs:
            entry_date, title = parse_timeline_date(ref.description)
            self.stdout.write(f"  [{ref.mechanism.name}]")
            self.stdout.write(f"    Date:  {entry_date or '(none)'}")
            self.stdout.write(f"    Title: {title}")
            self.stdout.write(f"    Desc:  {ref.description[:80]}...")
            self.stdout.write("")

            if apply:
                MechanismTimelineEntry.objects.create(
                    mechanism=ref.mechanism,
                    date=entry_date,
                    title=title,
                    description=ref.description,
                    link=ref.link,
                )
                ref.delete()
                timeline_created += 1

        if apply:
            self.stdout.write(self.style.SUCCESS(
                f"\nDone: {quotes_created} quotes created, {timeline_created} timeline entries created."
            ))
            remaining = MechanismReference.objects.count()
            self.stdout.write(f"Remaining MechanismReferences: {remaining}")
        else:
            self.stdout.write(self.style.WARNING(
                "\nDry run complete. Run with --apply to migrate."
            ))
