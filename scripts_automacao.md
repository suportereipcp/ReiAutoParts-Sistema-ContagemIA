\# Guia de Automação: Inicialização e Modo Kiosk



Instruções para configurar o Windows para abrir automaticamente o sistema no monitor principal e o painel de visualização na TV (Monitor 2).



\## 1. O Script de Inicialização (.bat)

Crie um arquivo chamado `start\_nexus.bat` e coloque-o na pasta de inicialização do Windows (pressione `Win + R` e digite `shell:startup`).



```bat

@echo off

:: Aguarda 10 segundos para a rede e serviços locais iniciarem

timeout /t 10



:: Abre a Interface do Operador no Monitor 1 (Principal)

start chrome --app="http://localhost:8000/operador" --window-position=0,0 --start-maximized



:: Abre a Visualização das Câmeras na TV (Monitor 2)

:: Nota: 1920 assume que o monitor 1 é Full HD. Ajuste este valor se a resolução do monitor 1 for diferente.

start chrome --app="http://localhost:8000/tv-dashboard" --window-position=1920,0 --kiosk

