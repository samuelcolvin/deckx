<slide layout="title"/>

### Deckx Starter

# A minimal deckx deck

## Built from markdown, HTML and CSS

<slide tab="intro"/>

# Hello, slide

- Slides are markdown, separated by `<slide .../>` lines
- Bigger blocks of HTML live in `components/*.html`
- Theme is plain CSS variables in `styles.css`

<slide tab="intro" title="Components"/>

# A component

Anything longer than a few lines of HTML goes in a file and is pulled in with a
`component` tag. The hero below nests a second component and an inlined image.

<component src="Hero.html"></component>

<slide tab="details" space="tight"/>

# Details

| Feature       | Where it lives        |
| ------------- | --------------------- |
| Slide content | `deck.md`             |
| Theme tokens  | `styles.css`          |
| Components    | `components/*.html`   |
| Config        | `deckx.toml`          |

<slide theme="light"/>

# A light slide

Lorem ipsum dolor sit amet.

- One
- Two
- Three

<slide tab="details"/>

# Code blocks

Highlighted in the browser by highlight.js:

```ts
export function greet(name: string): string {
  return `hello, ${name}`;
}

console.log(greet("deckx"));
```

<slide theme="light"/>

# Code on a light slide

```py
def greet(name: str) -> str:
    return f"hello, {name}"

print(greet("deckx"))
```

<slide layout="statement"/>

# One bold statement.
