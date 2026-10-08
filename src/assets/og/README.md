# Fonts for link-preview images

`TMOGSans-Regular.ttf` and `TMOGSans-Bold.ttf` are subsets of Liberation Sans (`public/fonts`), cut to
Latin letters, digits, basic punctuation and č ć š ž đ (and capitals), so the OG image edge functions
stay under Vercel's Edge Function size limit. Under the SIL Open Font License a modified version may
not use the Reserved Font Name "Liberation", hence the name "TMOG Sans". License: `LICENSE-OFL.txt`.

Regenerate with fontTools (`pip install fonttools`):

    pyftsubset public/fonts/LiberationSans-Bold.ttf --text-file=<chars> --no-hinting --desubroutinize \
      --layout-features=kern,liga --output-file=...

then rename the family in the `name` table (IDs 1, 3, 4, 6, 16) away from "Liberation".
A character missing from the subset renders with the fallback font; add it to the subset when the
OG text changes.
