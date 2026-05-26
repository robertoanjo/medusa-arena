import React from 'react';

interface Props {
  onClose: () => void;
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0,0,0,.75)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '16px',
};

const modal: React.CSSProperties = {
  background: '#1a0a2e',
  border: '1px solid rgba(201,168,76,.25)',
  borderRadius: 12,
  width: '100%', maxWidth: 540,
  maxHeight: '85vh',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
};

const header: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 18px',
  borderBottom: '1px solid rgba(201,168,76,.15)',
  flexShrink: 0,
};

const body: React.CSSProperties = {
  overflowY: 'auto',
  padding: '18px 18px 24px',
  fontSize: 13,
  lineHeight: 1.7,
  color: '#c8b890',
};

const h3: React.CSSProperties = {
  color: '#d4af37', fontSize: 13, fontWeight: 700,
  letterSpacing: '.06em', margin: '18px 0 6px',
};

const li: React.CSSProperties = { marginBottom: 4 };

export default function PrivacyPolicyModal({ onClose }: Props) {
  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={header}>
          <h2 style={{ color: '#d4af37', margin: 0, fontSize: 16 }}>
            🛡️ Política de Privacidade
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#8060a0', fontSize: 20, lineHeight: 1, padding: 4,
            }}
            aria-label="Fechar"
          >✕</button>
        </div>

        {/* Content */}
        <div style={body}>
          <p style={{ color: '#8060a0', fontSize: 12, margin: '0 0 12px' }}>
            Última atualização: maio de 2026
          </p>

          <p>
            O <strong style={{ color: '#d4af37' }}>Gaze of Medusa</strong> é um jogo PvP online
            desenvolvido de forma independente. Esta política explica como tratamos seus dados
            pessoais em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD —
            Lei 13.709/2018)</strong>.
          </p>

          <h3 style={h3}>1. RESPONSÁVEL PELO TRATAMENTO</h3>
          <p>
            Responsável: Roberto (desenvolvedor independente)<br />
            Contato: <a href="mailto:contactgazeofmedusa@gmail.com"
              style={{ color: '#d4af37' }}>contactgazeofmedusa@gmail.com</a>
          </p>

          <h3 style={h3}>2. DADOS COLETADOS</h3>
          <ul style={{ paddingLeft: 18, margin: '4px 0' }}>
            <li style={li}><strong>Nome de guerreiro</strong> — identificador público no jogo</li>
            <li style={li}><strong>Nome completo</strong> — opcional, não exibido publicamente</li>
            <li style={li}><strong>E-mail</strong> — necessário para verificação e recuperação de senha</li>
            <li style={li}><strong>Senha</strong> — armazenada em formato criptografado (bcrypt), nunca em texto puro</li>
            <li style={li}><strong>Estatísticas de jogo</strong> — vitórias, derrotas, pontos</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            Não coletamos dados de localização, pagamentos, documentos de identidade ou
            informações sensíveis.
          </p>

          <h3 style={h3}>3. FINALIDADE E BASE LEGAL</h3>
          <ul style={{ paddingLeft: 18, margin: '4px 0' }}>
            <li style={li}>Criar e gerenciar sua conta no jogo <em>(execução de contrato)</em></li>
            <li style={li}>Enviar e-mails de verificação e recuperação de senha <em>(execução de contrato)</em></li>
            <li style={li}>Exibir o placar público (leaderboard) <em>(legítimo interesse)</em></li>
          </ul>

          <h3 style={h3}>4. COMPARTILHAMENTO DE DADOS</h3>
          <p>Seus dados são processados pelos seguintes fornecedores de infraestrutura:</p>
          <ul style={{ paddingLeft: 18, margin: '4px 0' }}>
            <li style={li}><strong>Supabase</strong> — banco de dados (AWS São Paulo, Brasil)</li>
            <li style={li}><strong>Vercel</strong> — hospedagem das APIs (EUA)</li>
            <li style={li}><strong>Gmail / Resend</strong> — envio de e-mails transacionais</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            Não vendemos, alugamos ou compartilhamos seus dados com terceiros para fins
            comerciais ou publicitários.
          </p>

          <h3 style={h3}>5. RETENÇÃO DE DADOS</h3>
          <p>
            Seus dados são mantidos enquanto sua conta estiver ativa. Você pode solicitar
            a exclusão a qualquer momento diretamente pelo perfil do jogo. Contas inativas
            por mais de 12 meses poderão ser removidas automaticamente.
          </p>

          <h3 style={h3}>6. SEUS DIREITOS (LGPD ART. 18)</h3>
          <p>Você tem direito a:</p>
          <ul style={{ paddingLeft: 18, margin: '4px 0' }}>
            <li style={li}>Confirmar a existência de tratamento dos seus dados</li>
            <li style={li}>Acessar os dados que temos sobre você</li>
            <li style={li}>Corrigir dados incompletos ou desatualizados (via Perfil)</li>
            <li style={li}><strong>Excluir sua conta e todos os seus dados</strong> (via Perfil → Excluir conta)</li>
            <li style={li}>Revogar o consentimento a qualquer momento</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            Para exercer qualquer outro direito, entre em contato:&nbsp;
            <a href="mailto:contactgazeofmedusa@gmail.com"
              style={{ color: '#d4af37' }}>contactgazeofmedusa@gmail.com</a>
          </p>

          <h3 style={h3}>7. SEGURANÇA</h3>
          <p>
            Adotamos medidas técnicas para proteger seus dados: senhas criptografadas com
            bcrypt, tokens de sessão com 256 bits de entropia, comunicação via HTTPS e
            proteção contra tentativas em excesso (rate limiting).
          </p>

          <h3 style={h3}>8. ALTERAÇÕES</h3>
          <p>
            Esta política pode ser atualizada. Em caso de mudanças relevantes, notificaremos
            por e-mail ou aviso no jogo.
          </p>

          <div style={{
            marginTop: 20, padding: '10px 14px',
            background: 'rgba(201,168,76,.06)',
            borderRadius: 8, border: '1px solid rgba(201,168,76,.15)',
            fontSize: 12, color: '#8060a0',
          }}>
            Esta política está em conformidade com a LGPD (Lei 13.709/2018) e as diretrizes
            da ANPD (Autoridade Nacional de Proteção de Dados).
          </div>
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(201,168,76,.1)', flexShrink: 0 }}>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
