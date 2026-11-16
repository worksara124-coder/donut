/** Wraps each word in a clipping mask so headlines can rise in word by word. */
export default function SplitWords({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <span className="rw inline-block">{w}&nbsp;</span>
        </span>
      ))}
    </>
  );
}
