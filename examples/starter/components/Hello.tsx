/** Tiny example component to prove that custom TSX in components/ is wired up. */
export default function Hello({ name }: { name: string }) {
  return (
    <p style={{ marginTop: '1em', fontStyle: 'italic' }}>
      Hello from <code>{name}</code>!
    </p>
  )
}
