
-- Add slug column to boards table
ALTER TABLE public.boards ADD COLUMN slug text;

-- Function to generate a slug
CREATE OR REPLACE FUNCTION public.generate_slug(text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  slug text;
BEGIN
  -- Convert to lowercase
  slug := lower($1);
  -- Replace non-alphanumeric characters with hyphens
  slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
  -- Remove leading/trailing hyphens
  slug := trim(both '-' from slug);
  -- Handle empty slug
  IF slug = '' THEN
    slug := 'board';
  END IF;
  -- Ensure uniqueness
  RETURN (SELECT CASE WHEN count(*) = 0 THEN slug ELSE slug || '-' || substr(md5(random()::text), 1, 4) END FROM public.boards WHERE public.boards.slug = slug);
END;
$$;

-- Trigger to set slug on insert/update of boards
CREATE OR REPLACE FUNCTION public.set_board_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.slug := public.generate_slug(NEW.name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_board_slug_trigger
BEFORE INSERT OR UPDATE OF name ON public.boards
FOR EACH ROW
EXECUTE FUNCTION public.set_board_slug();
