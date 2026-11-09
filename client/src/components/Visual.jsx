export default function Visual({ data }) {
  if (!data || data.type === "none") return null;
  return (
    <figure className="visual">
      {data.title && <figcaption>{data.title}</figcaption>}
      {data.type === "flow" && (
        <div className="flow">
          {data.steps?.map((s, i) => (
            <div className="step" key={i}>
              <span className="num">{i + 1}</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
      {data.type === "compare" && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>{data.columns?.map((c, i) => <th key={i}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {data.rows?.map((r, i) => (
                <tr key={i}>{Array.isArray(r) && r.map((c, j) => <td key={j}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.type === "concept" && (
        <div className="concept">
          <div className="center">{data.center}</div>
          <div className="branches">
            {data.branches?.map((b, i) => <div className="branch" key={i}>{b}</div>)}
          </div>
        </div>
      )}
    </figure>
  );
}
