/* Bare layout for the preview iframe. Skips the (app) chrome (top nav,
 * brand sidebar) so the iframe shows just the rendered page blocks. */

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
