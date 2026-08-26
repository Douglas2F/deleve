# Deleve

**Sua rotina, do seu jeito.**

Aplicação web modular e mobile-first para acompanhar hábitos com poucos toques. O primeiro módulo em desenvolvimento é **Saúde**.

## Funcionalidades atuais

- configuração inicial personalizada;
- dashboard diário de saúde;
- registros de água com histórico semanal e lançamento retroativo;
- registros de sono com duração, meta e calendário semanal;
- exercícios com modalidade, duração, distância opcional, pace de corrida e velocidade média de ciclismo;
- histórico de peso e evolução desde o primeiro registro;
- relatório semanal consolidado;
- edição e exclusão de registros;
- validações no frontend e no backend.

## Tecnologias

- **Frontend:** React, TypeScript, Vite e Tailwind CSS;
- **Backend:** Python e Flask;
- **Banco de dados:** SQLite;
- **Testes:** Pytest e TypeScript.

## Preparar o backend no Windows

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python -m flask --app run init-db
python -m flask --app run run
```

O backend ficará disponível em `http://127.0.0.1:5000`.

## Preparar o frontend

Em outro terminal:

```powershell
cd frontend
npm install
npm run dev
```

O aplicativo ficará disponível em `http://localhost:5173`.

## Executar os testes

Na raiz do projeto:

```powershell
python -m pytest
```

No diretório `frontend`:

```powershell
npm run build
```

## Dados locais

O banco SQLite, o ambiente virtual, dependências instaladas e arquivos de build são ignorados pelo Git. Assim, os registros pessoais permanecem apenas no computador do usuário.

## Estado do projeto

Versão inicial funcional do módulo Saúde. Os próximos módulos previstos são Estudos, Leitura e Rotina.
