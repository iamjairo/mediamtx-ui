// Stand-in for tabs not yet ported. Renders a clean "coming soon" card so the
// sidebar/router work end-to-end even before the rest of the migration.
export default function Placeholder({ name }) {
  return (
    <div className="tab" style={{ padding: 'var(--space-xl) var(--space-l)' }}>
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px dashed var(--card-border)',
          borderRadius: 'var(--radius-m)',
          padding: 'var(--space-xl)',
          textAlign: 'center',
          color: 'var(--text-muted-color)',
        }}
      >
        <h2 style={{ color: 'var(--text-color)', margin: '0 0 var(--space-s) 0' }}>{name}</h2>
        <p style={{ margin: 0, fontSize: 'var(--fs-s)' }}>
          This tab hasn't been ported to React yet — coming in the full migration pass.
        </p>
      </div>
    </div>
  );
}
