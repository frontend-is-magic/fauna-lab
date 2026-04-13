export default function HomePage() {
  return (
    <section className="card">
      <h2 className="page-title">Fauna Lab</h2>
      <p className="page-desc">
        这是约定式路由入口页。后续只要在 <code>src/pages</code> 里新增
        <code>.tsx</code> 文件，路由就会自动生效。
      </p>
      <ul className="page-list">
        <li>静态页直接按文件名生成路径。</li>
        <li><code>index.tsx</code> 对应根路径 <code>/</code>。</li>
        <li><code>[id].tsx</code> 这类文件可映射为动态路由。</li>
      </ul>
    </section>
  );
}
