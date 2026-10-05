import rule from '../src/rules/tailwind-class-strings.ts';
import { tsxTester as tester } from './tester.ts';

tester.run('tailwind-class-strings', rule, {
  valid: [
    // Compared strings and arguments are not class values, whatever they contain.
    'const isRow = element.className === "flex gap-2";',
    'expect(element).toHaveClass("flex gap-2");',
    'const seen = new Set(["flex gap-2"]);',
    'expect(props).toEqual({ className: "flex gap-2" });',
    'function applyDecoration(style = { textDecorationLine: "underline overline line-through" }) { return style; }',
    'rowStyle = { textDecorationLine: "underline overline line-through" };',
    'const props = { styles: { textDecorationLine: "underline overline line-through" } };',
    // CSS values under every spelling of a `style` member.
    'const props = { "style": { textDecorationLine: "underline overline line-through" } };',
    'class Row { style = { textDecorationLine: "underline overline line-through" }; }',
    'element["style"].textDecorationLine = "underline overline line-through";',
    // A key selects an entry of a class map; it is not the class value.
    'const rowClassName = ROW_CLASSES["active"];',
    'const ROW_CLASSES = { ["active"]: tw`opacity-100` };',
    'const ROW_CLASSES = new Map([["active", tw`opacity-100`]]);',
    'const rowClassName = ROW_CLASSES[`state-${state}`];',
    'const ROW_CLASSES = { [`state-${state}`]: tw`flex gap-2` };',
    // Without a class-named binding, prose and CSS values are left alone.
    "it('table-driven tests for hidden fields', () => {});",
    "const backgroundOrigin = 'border-box, content-box';",
    'type Classes = { ["flex gap-2"]: string };',
    // A domain "class" is not a class list.
    'const petClass = "mammal";',
    // CSS values in a style object are not class lists.
    "const style = { display: 'inline flex' };",
    "const rowProps = { style: { display: 'inline flex' } };",
    "element.style.display = 'inline flex';",
    "element.style.setProperty('display', 'inline flex');",
    "element.style[property] = 'inline flex';",
    "const display = 'inline flex';",
    "const row = <div style={{ display: 'inline grid' }} />;",
    // A string compared in the condition is not part of the class value.
    'import { tw } from "@repo/ui";\nconst rowClassName = status === "loading" ? tw`opacity-50` : tw`opacity-100`;',
    // Names that merely contain "class" are not class lists.
    'const classification = "customer";',
    'const row = { classification: "self-registered" };',
    // Brackets alone are not Tailwind: a selector, and an IPv6 address.
    `document.querySelector('[data-slot="tooltip-content"]');`,
    "const isLoopback = hostname === '[::1]';",
    'class Example { "flex gap-2" = true; }',
    'enum Example { "flex gap-2" = 1 }',
    'const value = 1; export { value as "flex gap-2" };',
    '<div className="flex items-center gap-2" />',
    '<div className={isOpen ? "flex gap-2" : "hidden md:block"} />',
    'const ROW = tw`sticky left-0 z-20`;',
    'const classes = cn("flex gap-2", isOpen && "bg-muted text-foreground");',
    'const variants = cva("inline-flex items-center", { variants: { size: { sm: "h-8 px-3" } } });',
    // Not class lists: enum members, data attributes, prose, CSS values.
    '<Icon data-icon="inline-start" />',
    '<div data-slot="select-item" />',
    '<Toaster position="top-center" />',
    'const kind = "select-location";',
    'it("uppercase slug", () => {});',
    'expect(element.className).toContain("text-destructive");',
    'const style = { overflow: "hidden" };',
    'import x from "flex-gap-utils";',
    'type Align = "inline-start" | "inline-end";',
  ],
  invalid: [
    {
      name: 'a class list inside a callback passed to a style attribute',
      code: 'const row = <div style={useMemo(() => { const rowClassName = "flex gap-2"; return { display: "flex" }; }, [])} />;',
      errors: 1,
    },
    {
      name: 'a class list inside a callback held by a styles object',
      code: 'const styles = { row: () => { const rowClassName = "flex gap-2"; return rowClassName; } };',
      errors: 1,
    },
    {
      name: 'a class list inside a memo callback bound to a styles constant',
      code: 'const styles = useMemo(() => { const rowClassName = "flex gap-2"; return { rowClassName }; }, []);',
      errors: 1,
    },
    {
      name: 'a class list inside a function assigned to a "Styles"-named member',
      code: 'helpers.getStyles = () => { const rowClassName = "flex gap-2"; return { className: rowClassName }; };',
      errors: 1,
    },
    {
      name: 'a class list inside a function whose name ends in "Styles"',
      code: 'const getStyles = () => { const rowClassName = "flex gap-2"; return { className: rowClassName }; };',
      errors: 1,
    },
    {
      name: 'a receiver whose name merely contains "style"',
      code: 'styledElement.className = "flex gap-2";',
      errors: 1,
    },
    {
      name: 'a class-named member returned from a callback',
      code: 'const rows = items.map(() => ({ className: "flex gap-2" }));',
      errors: 1,
    },
    {
      name: 'a class-named prop on an element passed to a call',
      code: 'render(<Table containerClassName="flex gap-2" />);',
      errors: 1,
    },
    {
      name: 'a class list under a neutral name, known to Tailwind',
      code: 'const tones = { red: "border-label-red/40 bg-label-red/12", blue: "text-label-blue bg-muted" };',
      errors: 2,
    },
    {
      name: 'a template of utilities under a neutral name',
      code: 'const rail = `hidden w-64 ${extra}`;',
      errors: 1,
    },
    {
      name: 'a template under a tag that is not a class function',
      code: "const ROW_CLASSES = String.raw`before:content-['a_b']`;",
      errors: 1,
    },
    {
      name: 'a class list built only from interpolations',
      code: 'const rowClassName = `${baseClasses} ${toneClasses}`;',
      errors: 1,
    },
    {
      name: 'a token with characters outside ASCII',
      code: `const ROW_CLASSES = "flex before:content-['✓']";`,
      errors: 1,
    },
    {
      name: 'a class-named property assigned through a quoted key',
      code: "element['className'] = 'flex gap-2';",
      errors: 1,
    },
    {
      name: 'a class-named member declared through a quoted computed key',
      code: "const props = { ['className']: 'flex gap-2' };",
      errors: 1,
    },
    {
      name: 'a digit-led variant',
      code: 'const ROW_CLASSES = "flex 2xl:grid-cols-4";',
      errors: 1,
    },
    {
      name: 'a class-named parameter default',
      code: 'function getClasses(className = "flex gap-2") { return className; }',
      errors: 1,
    },
    {
      name: 'a class-named field initializer',
      code: 'class Row { className = "flex gap-2"; }',
      errors: 1,
    },
    {
      name: 'a class list assigned to a class-named property',
      code: 'element.className = "resize-none";',
      errors: 1,
    },
    {
      name: 'a utility missing from the list, bound to a class-named constant',
      code: 'const LINK_CLASSES = "no-underline";',
      errors: 1,
    },
    {
      name: 'a single resize utility bound to a class-named constant',
      code: 'const TEXTAREA_CLASSES = "resize-none";',
      errors: 1,
    },
    {
      name: 'an arbitrary property bound to a class-named constant',
      code: 'const ROW_CLASSES = "[contain:layout]";',
      errors: 1,
    },
    {
      code: 'const OPEN_COLUMN_CLASS_NAME = "sticky left-0 z-20 bg-background pr-0";',
      errors: 1,
    },
    { code: 'const NOTE_TEXTAREA_CLASSES = "max-h-40 resize-y";', errors: 1 },
    {
      code: 'const HOVER_CLASSES = "group-hover/row:bg-[color-mix(in_srgb,red_50%,blue)]";',
      errors: 1,
    },
    { code: '<Table containerClassName="overflow-visible" />', errors: 1 },
    {
      code: 'const TONE_CLASSES = { red: "border-label-red/40 bg-label-red/12", blue: "text-label-blue bg-muted" };',
      errors: 2,
    },
    {
      code: 'const options = { classNames: { toast: isMobile ? "text-base!" : undefined } };',
      errors: 1,
    },
    { code: 'const railClassName = `hidden w-64 ${extra}`;', errors: 1 },
  ],
});
