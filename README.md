# Deleve

**Sua rotina, do seu jeito.**

Aplicação web modular e mobile first para acompanhar hábitos com o mínimo de esforço. O primeiro módulo em desenvolvimento é **Saúde**.

## Estado atual

Esta primeira etapa contém:

- estrutura modular da aplicação;
- página inicial responsiva do módulo Saúde;
- configuração do SQLite;
- tabela inicial do perfil de saúde;
- testes da página e do banco de dados.

## Preparar o projeto no Windows

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

Se o comando `py` não estiver disponível, use o caminho da sua instalação do Python.

## Criar o banco de dados

```powershell
flask --app run init-db
```

## Executar

```powershell
flask --app run run --debug
```

Abra `http://127.0.0.1:5000` no navegador.

## Testar

```powershell
pytest
```

## Próxima etapa

Implementar a configuração inicial do perfil de saúde com apenas os dados realmente necessários.
