export default function ComingSoon() {
  return (
    <div className="ck-launch-wrap">
      <div className="ck-launch-eyebrow">🔮 更多规划中</div>
      <h1 className="ck-launch-title">CodeKit 即将发布</h1>
      <div className="ck-launch-sub">把重复开发工作，打包成一次点击</div>

      <div className="ck-launch-card">
        <div className="ck-launch-glow" />

        <div className="ck-launch-float ck-launch-bolt">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>

        <div className="ck-launch-float ck-launch-timer">00:00:00:00</div>
        <div className="ck-launch-float ck-launch-dots">
          <span />
          <span />
          <span />
        </div>

        <div className="ck-launch-window">
          <div className="ck-launch-titlebar">
            <span className="ck-launch-dot r" />
            <span className="ck-launch-dot y" />
            <span className="ck-launch-dot g" />
            <span className="ck-launch-t">CodeKit</span>
          </div>
          <div className="ck-launch-body">
            <div className="ck-launch-sidebar">
              <div className="ck-launch-si" style={{ color: '#2563eb' }}>
                {'{}'}
              </div>
              <div className="ck-launch-si" style={{ color: '#8b5cf6' }}>
                &lt;/&gt;
              </div>
              <div className="ck-launch-si" style={{ color: '#10b981' }}>
                ⚡
              </div>
              <div className="ck-launch-si" style={{ color: '#ec4899' }}>
                🛠
              </div>
            </div>
            <div className="ck-launch-main">
              {/* 左：压缩输入 */}
              <div className="ck-launch-panel">
                <div className="ck-launch-tab">
                  <span className="ck-launch-tabdot" style={{ background: '#f59e0b' }} />
                  input.json
                </div>
                <div className="ck-launch-code">
                  <span className="ck-c-punc">{'{'}</span>
                  <span className="ck-c-key">"name"</span>
                  <span className="ck-c-punc">:</span>
                  <span className="ck-c-str">"CodeKit"</span>
                  <span className="ck-c-punc">,</span>
                  <span className="ck-c-key">"version"</span>
                  <span className="ck-c-punc">:</span>
                  <span className="ck-c-str">"2.0"</span>
                  <span className="ck-c-punc">,</span>
                  <span className="ck-c-key">"online"</span>
                  <span className="ck-c-punc">:</span>
                  <span className="ck-c-bool">true</span>
                  <span className="ck-c-punc">{'}'}</span>
                </div>
              </div>
              {/* 右：格式化输出 */}
              <div className="ck-launch-panel">
                <div className="ck-launch-tab">
                  <span className="ck-launch-tabdot" style={{ background: '#10b981' }} />
                  output.json
                </div>
                <div className="ck-launch-code">
                  <div>
                    <span className="ck-c-punc">{'{'}</span>
                  </div>
                  <div>
                    <span>{'  '}</span>
                    <span className="ck-c-key">"name"</span>
                    <span className="ck-c-punc">:</span> <span className="ck-c-str">"CodeKit"</span>
                    <span className="ck-c-punc">,</span>
                  </div>
                  <div>
                    <span>{'  '}</span>
                    <span className="ck-c-key">"version"</span>
                    <span className="ck-c-punc">:</span> <span className="ck-c-str">"2.0"</span>
                    <span className="ck-c-punc">,</span>
                  </div>
                  <div>
                    <span>{'  '}</span>
                    <span className="ck-c-key">"online"</span>
                    <span className="ck-c-punc">:</span> <span className="ck-c-bool">true</span>
                  </div>
                  <div>
                    <span className="ck-c-punc">{'}'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ck-launch-cubes">
          <div className="ck-launch-cube c1" />
          <div className="ck-launch-cube c2" />
          <div className="ck-launch-cube c3" />
        </div>
      </div>

      <div className="ck-launch-chips">
        <div className="ck-launch-chip">
          <span className="ck-launch-chipdot" style={{ background: '#2563eb' }} />
          格式转换
        </div>
        <div className="ck-launch-chip">
          <span className="ck-launch-chipdot" style={{ background: '#10b981' }} />
          在线测试
        </div>
        <div className="ck-launch-chip">
          <span className="ck-launch-chipdot" style={{ background: '#ec4899' }} />
          效率工具
        </div>
      </div>

      <div className="ck-launch-foot">正在打包更多神器，请系好安全带 🚀</div>
    </div>
  );
}
