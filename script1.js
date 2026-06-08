// ==========================================
// 1. GLOBALE VARIABLEN & SEITENSTEUERUNG
// ==========================================
let timerIntervall;
let sekunden = 0;
let spielLaeuft = false; /* Timer soll erst anfangen, wenn man in das Grid drückt */
let verbleibendeWuermer = 10; // Startet bei 10 (passend zu ANZAHL_WUERMER)
let spielfeldDaten = [];
const ANZAHL_WUERMER = 10; // 10 Würmer

function zeigeInhalt(seitenId)
    {
    // 1. Alle Seiten verstecken
    document.querySelectorAll('.seite').forEach(div => div.style.display = 'none');
    
    // 2. Gewünschte Seite anzeigen
    document.getElementById(seitenId).style.display = 'block';

    // JEDES MAL WENN WIR DIE SEITE WECHSELN: Timer stoppen und zurücksetzen
    clearInterval(timerIntervall);
    sekunden = 0;
    
    const timerElement = document.getElementById('timer');
    if (timerElement)
        {
        timerElement.innerText = "00:00";
        }

    spielLaeuft = false;

    // WENN das Spiel gestartet wird, starten Grid, Timer UND die Würmer-Anzahl frisch!
    if (seitenId === 'klassisch')
        {
        // >>> NEU: Würmer-Zähler komplett zurücksetzen beim Modus-Wechsel <<<
        verbleibendeWuermer = ANZAHL_WUERMER; 
        
        const zaehlerElement = document.getElementById('wurm-zaehler');
        if (zaehlerElement)
            {
            zaehlerElement.innerText = verbleibendeWuermer;
            }

        // >>> NEU: Eventuelle manuelle Stile (rote Felder) im HTML-Grid säubern, falls das Grid noch existierte <<<
        const alleKae = document.getElementById('spielfeld')?.children;
        if (alleKae) 
            {
            for (let i = 0; i < alleKae.length; i++) 
                {
                alleKae[i].style.backgroundColor = "";
                alleKae[i].style.color = "";
                }
            }

        baueSpielfeld();
        }
    }

// ==========================================
// 2. SPIELFELD-GENERIERUNG & KLICK-LOGIK
// ==========================================
function baueSpielfeld()
    {
    const spielfeld = document.getElementById('spielfeld');
    if (!spielfeld) return;
    
    spielfeld.innerHTML = ''; 
    spielfeldDaten = []; 

    // 1. Spielfeld im Hintergrund erstellen (9x9)
    for (let zeile = 0; zeile < 9; zeile++)
        {
        for (let spalte = 0; spalte < 9; spalte++)
            {
            spielfeldDaten.push({
                zeile: zeile,
                spalte: spalte,
                istWurm: false,
                istOffen: false
                });
            }
        }

    // 2. Zufällig 10 Würmer verteilen
    let platzierteWuermer = 0;
    while (platzierteWuermer < ANZAHL_WUERMER)
        {
        let zufallsIndex = Math.floor(Math.random() * 81);
        
        if (!spielfeldDaten[zufallsIndex].istWurm)
            {
            spielfeldDaten[zufallsIndex].istWurm = true;
            platzierteWuermer++;
            }
        }

    // 3. HTML-Elemente erzeugen und Klick-Logik berechnen
    spielfeldDaten.forEach((datenKiste, index) =>
        {
        const kaestchen = document.createElement('div');
        kaestchen.classList.add('grid-kaestchen');
        
        // --- LINKSKLICK: AUFDECKEN ODER CHORDING ---
        kaestchen.addEventListener('click', function()
            {
            // Wenn das Spiel vorbei ist, aber schon Sekunden auf der Uhr sind -> Klick blockieren!
            if (!spielLaeuft && sekunden > 0) return;

            if (!spielLaeuft)
                {
                spielLaeuft = true;
                starteTimer();      
                }

            // CHORDING-LOGIK: Wenn das Kästchen schon offen ist, prüfen wir auf Zahlenklick
            if (datenKiste.istOffen) 
                {
                let wurmAnzahl = zaehleNachbarWuermer(datenKiste.zeile, datenKiste.spalte);
                
                // Macht nur Sinn, wenn das Feld eine Zahl größer als 0 ist
                if (wurmAnzahl > 0) 
                    {
                    pruefeUndOeffneNachbarnAutomatisch(datenKiste.zeile, datenKiste.spalte, wurmAnzahl);
                    }
                return; // Funktion hier abbrechen
                }

            // Wenn eine Flagge auf dem geschlossenen Feld steht, blockieren wir den normalen Linksklick
            if (kaestchen.innerText === "🚩") return; 
            
            datenKiste.istOffen = true;
            kaestchen.classList.add('offen');

            // Wenn ein Wurm getroffen wurde (Game Over)
            if (datenKiste.istWurm)
                {
                kaestchen.innerText = "🪱"; 
                spielVerloren(kaestchen); // Wir übergeben das Kästchen, damit es rot gefärbt werden kann!
                }
            else
                {
                let wurmAnzahl = zaehleNachbarWuermer(datenKiste.zeile, datenKiste.spalte);
                if (wurmAnzahl > 0) {
                    kaestchen.innerText = wurmAnzahl;
                    if (wurmAnzahl === 1) kaestchen.style.color = "blue";
                    if (wurmAnzahl === 2) kaestchen.style.color = "green";
                    if (wurmAnzahl === 3) kaestchen.style.color = "red";
                } else {
                    kaestchen.innerText = "";
                    oeffneNachbarn(datenKiste.zeile, datenKiste.spalte);
                }
                }
                pruefeGewinn();
            });

        // --- RECHTSKLICK: FLAGGEN SETZEN ---
        kaestchen.addEventListener('contextmenu', function(e)
            {
            e.preventDefault();     // Standard Browser-Menü unterdrücken

            // Verhindert, dass man nach dem Game Over noch Flaggen setzen oder entfernen kann
            if (!spielLaeuft && sekunden > 0) return;
            if (datenKiste.istOffen) return;

            const zaehlerElement = document.getElementById('wurm-zaehler');
            
            if (kaestchen.innerText === "🚩")
                {
                // Flagge entfernen geht IMMER
                kaestchen.innerText = "";
                verbleibendeWuermer++;
                }
            else
                {
                // Eine NEUE Flagge setzen geht nur, wenn noch Würmer übrig sind!
                if (verbleibendeWuermer <= 0) 
                    {
                    return; // Bricht die Funktion ab – keine Flagge wird gesetzt!
                    }
                kaestchen.innerText = "🚩";
                verbleibendeWuermer--;
                }

            if (zaehlerElement)
                {
                zaehlerElement.innerText = verbleibendeWuermer;
                }
            });

        spielfeld.appendChild(kaestchen);
        });

    // 4. Ein sicheres Startfeld direkt beim Laden mit einem "X" markieren
    let startFeldGefunden = false;
    let versuche = 0;

    while (!startFeldGefunden && versuche < 100)
        {
        let zufallsIndex = Math.floor(Math.random() * 81);
        let testFeld = spielfeldDaten[zufallsIndex];

        // Wir nehmen ein Feld, das kein Wurm ist UND idealerweise 0 Nachbarwürmer hat
        if (!testFeld.istWurm && zaehleNachbarWuermer(testFeld.zeile, testFeld.spalte) === 0)
            {
            const htmlKae = spielfeld.children[zufallsIndex];
            
            htmlKae.innerText = "X";
            htmlKae.style.color = "#4CAF50"; // Schönes Grün für das X
            htmlKae.style.fontWeight = "bold";
            
            startFeldGefunden = true; 
            }
            versuche++;
        }
    }

// ==========================================
// 3. MINESWEEPER MATHEMATIK & ALGORITHMEN
// ==========================================

// Sucht im 9x9 Gitter nach Würmern in der Umgebung
function zaehleNachbarWuermer(zielZeile, zielSpalte)
    {
    let gefunden = 0;

    for (let zAbweichung = -1; zAbweichung <= 1; zAbweichung++)
        {
        for (let sAbweichung = -1; sAbweichung <= 1; sAbweichung++)
            {
            let pruefZeile = zielZeile + zAbweichung;
            let pruefSpalte = zielSpalte + sAbweichung;

            if (pruefZeile >= 0 && pruefZeile < 9 && pruefSpalte >= 0 && pruefSpalte < 9)
                {
                let index = pruefZeile * 9 + pruefSpalte;
                let nachbarFeld = spielfeldDaten[index];
                
                if (nachbarFeld && nachbarFeld.istWurm)
                    {
                    gefunden++;
                    }
                }
            }
        }
        return gefunden;
    }

// Kettenreaktion: Öffnet alle leeren Nachbarfelder automatisiert
function oeffneNachbarn(startZeile, startSpalte)
    {
    for (let z = -1; z <= 1; z++)
        {
        for (let s = -1; s <= 1; s++)
            {
            let pZeile = startZeile + z;
            let pSpalte = startSpalte + s;

            if (pZeile >= 0 && pZeile < 9 && pSpalte >= 0 && pSpalte < 9)
                {
                let index = pZeile * 9 + pSpalte; 
                let feld = spielfeldDaten[index];

                if (feld && !feld.istOffen && !feld.istWurm)
                    {
                    feld.istOffen = true;
                    
                    const htmlKae = document.getElementById('spielfeld').children[index];
                    htmlKae.classList.add('offen');

                    let anzahl = zaehleNachbarWuermer(pZeile, pSpalte);
                    if (anzahl > 0)
                        {
                        htmlKae.innerText = anzahl;
                        if (anzahl === 1) htmlKae.style.color = "blue";
                        if (anzahl === 2) htmlKae.style.color = "green";
                        if (anzahl === 3) htmlKae.style.color = "red";
                        }
                    else
                        {
                        htmlKae.innerText = "";
                        oeffneNachbarn(pZeile, pSpalte); 
                        }
                    }
                }
            }
        }
    }

// CHORDING-HILFSFUNKTION: Zählt Flaggen im Umkreis einer Zahl und deckt den Rest auf
function pruefeUndOeffneNachbarnAutomatisch(zielZeile, zielSpalte, benoetigteFlaggen) 
    {
    let flaggenGezaehlt = 0;
    let nachbarFelder = [];

    // 1. Alle Nachbarn im 3x3 Bereich heraussuchen und Flaggen zählen
    for (let zAbweichung = -1; zAbweichung <= 1; zAbweichung++) 
        {
        for (let sAbweichung = -1; sAbweichung <= 1; sAbweichung++) 
            {
            let pruefZeile = zielZeile + zAbweichung;
            let pruefSpalte = zielSpalte + sAbweichung;

            if (pruefZeile >= 0 && pruefZeile < 9 && pruefSpalte >= 0 && pruefSpalte < 9) 
                {
                let index = pruefZeile * 9 + pruefSpalte;
                let feld = spielfeldDaten[index];
                const htmlKae = document.getElementById('spielfeld').children[index];

                nachbarFelder.push({ daten: feld, html: htmlKae });

                if (!feld.istOffen && htmlKae.innerText === "🚩") 
                    {
                    flaggenGezaehlt++;
                    }
                }
            }
        }

    // 2. Wenn genug Flaggen gesetzt sind, decken wir die restlichen geschlossenen Felder auf
    if (flaggenGezaehlt === benoetigteFlaggen) 
        {
        nachbarFelder.forEach(nachbar => 
            {
            if (!nachbar.daten.istOffen && nachbar.html.innerText !== "🚩") 
                {
                nachbar.daten.istOffen = true;
                nachbar.html.classList.add('offen');

                // Wenn du eine Flagge falsch gesetzt hast und hier ein Wurm liegt -> BOOM!
                if (nachbar.daten.istWurm) 
                    {
                    nachbar.html.innerText = "🪱";
                    spielVerloren(nachbar.html); // Dieses falsche Nachbarfeld fliegt in die Luft!
                    } 
                else 
                    {
                    let anzahl = zaehleNachbarWuermer(nachbar.daten.zeile, nachbar.daten.spalte);
                    if (anzahl > 0) 
                        {
                        nachbar.html.innerText = anzahl;
                        if (anzahl === 1) nachbar.html.style.color = "blue";
                        if (anzahl === 2) nachbar.html.style.color = "green";
                        if (anzahl === 3) nachbar.html.style.color = "red";
                        } 
                    else 
                        {
                        nachbar.html.innerText = "";
                        oeffneNachbarn(nachbar.daten.zeile, nachbar.daten.spalte); 
                        }
                    }
                }
            });
        pruefeGewinn();
        }
    }

// ==========================================
// 4. TIMER & USER-SYSTEM (LOCAL STORAGE)
// ==========================================
function starteTimer()
    {
    timerIntervall = setInterval(() =>
        {
        sekunden++;
        
        let min = Math.floor(sekunden / 60);
        let sek = sekunden % 60;

        let minAnzeige = min < 10 ? '0' + min : min;
        let sekAnzeige = sek < 10 ? '0' + sek : sek;

        document.getElementById('timer').innerText = `${minAnzeige}:${sekAnzeige}`;
        }, 1000); 
    }

function starteAlsGast()
    {
    localStorage.setItem('spielerStatus', 'gast');
    localStorage.setItem('spielerName', 'Anonymer Wurm');
    zeigeInhalt('klassisch');
    aktualisiereProfilAnzeige();
    }

function starteAlsSpieler(name)
    {
    localStorage.setItem('spielerStatus', 'eingeloggt');
    localStorage.setItem('spielerName', name); 
    zeigeInhalt('klassisch');
    aktualisiereProfilAnzeige();
    }

function aktualisiereProfilAnzeige()
    {
    const name = localStorage.getItem('spielerName') || 'Nicht angemeldet';
    const spielerElement = document.getElementById('aktueller-spieler-name');
    if (spielerElement)
        {
        spielerElement.innerText = name;
        }
    }

// ==========================================
// 5. CHAT SYSTEM
// ==========================================
function toggleChat()
    {
    const chatBody = document.getElementById('chat-body');
    const icon = document.getElementById('chat-status-icon');
    
    if (chatBody.style.display === 'none')
        {
        chatBody.style.display = 'block';
        icon.innerText = '▼';
        ladeNachrichten(); 
        }
    else
        {
        chatBody.style.display = 'none';
        icon.innerText = '▲';
        }
    }

function sendeNachricht()
    {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (text === '') return; 

    const spielerName = localStorage.getItem('spielerName') || 'Nicht angemeldet';

    const jetzt = new Date();
    const stunden = jetzt.getHours().toString().padStart(2, '0');
    const minuten = jetzt.getMinutes().toString().padStart(2, '0');
    const uhrzeit = `${stunden}:${minuten}`;

    const neueNachricht = {
        name: spielerName,
        text: text,
        zeit: uhrzeit
    };

    let alleNachrichten = JSON.parse(localStorage.getItem('chatVerlauf')) || [];
    alleNachrichten.push(neueNachricht);
    localStorage.setItem('chatVerlauf', JSON.stringify(alleNachrichten));

    input.value = '';
    ladeNachrichten();
    }

function ladeNachrichten()
    {
    const box = document.getElementById('chat-nachrichten');
    if (!box) return;

    box.innerHTML = ''; 
    const alleNachrichten = JSON.parse(localStorage.getItem('chatVerlauf')) || [];

    alleNachrichten.forEach(msg =>
        {
        const div = document.createElement('div');
        div.classList.add('nachricht');
        
        div.innerHTML = `
            <div class="nachricht-info"><strong>${msg.name}</strong> • ${msg.zeit}</div>
            <div class="nachricht-text">${msg.text}</div>
        `;
        
        box.appendChild(div);
        });

    box.scrollTop = box.scrollHeight;
    }

// ==========================================
// 6. SPIELENDE: GEWINNEN ODER VERLIEREN
// ==========================================

// Zeigt beim Verlieren alle Würmer und färbt den Übeltäter rot
function spielVerloren(ausgeloestesKaestchen)
    {
    clearInterval(timerIntervall); 
    spielLaeuft = false; 
    
    // Den exakten Todes-Wurm knallrot einfärben
    if (ausgeloestesKaestchen) 
        {
        ausgeloestesKaestchen.style.backgroundColor = "#ff5252"; 
        ausgeloestesKaestchen.style.color = "white";
        }

    // Alle anderen Würmer im Spielfeld ebenfalls dezent aufdecken
    spielfeldDaten.forEach((feld, index) => 
        {
        if (feld.istWurm) 
            {
            const htmlKae = document.getElementById('spielfeld').children[index];
            
            if (htmlKae.innerText !== "🚩") 
                {
                htmlKae.innerText = "🪱";
                htmlKae.classList.add('offen');
                if (htmlKae !== ausgeloestesKaestchen) 
                    {
                    htmlKae.style.backgroundColor = "#ffcdd2"; // Dezentes Rosa für unberührte Würmer
                    }
                }
            }
        });
    
    const overlay = document.getElementById("game-over-overlay");
    if (overlay) 
        {
        overlay.classList.remove("hidden"); 
        }
    }

function pruefeGewinn() 
    {
    const nochZuOeffnen = spielfeldDaten.filter(f => !f.istWurm && !f.istOffen).length;

    if (nochZuOeffnen === 0 && spielLaeuft) 
        {
        clearInterval(timerIntervall); 
        spielLaeuft = false; 

        starteGewinnAnimation();

        const aktuelleZeit = document.getElementById('timer').innerText;
        const zeitAnzeige = document.getElementById('gewinn-zeit');
        if (zeitAnzeige) 
            {
            zeitAnzeige.innerText = aktuelleZeit;
            }

        const wonOverlay = document.getElementById("game-won-overlay");
        if (wonOverlay) 
            {
            wonOverlay.classList.remove("hidden");
            }
        }
    }

function starteGewinnAnimation() {
    const farben = ['#ff0a43', '#ffdd1c', '#00e676', '#00b0ff', '#d500f9'];
    
    for (let i = 0; i < 100; i++) {
        const konfetti = document.createElement('div');
        konfetti.classList.add('konfetti');
        
        konfetti.style.left = Math.random() * 100 + 'vw'; 
        konfetti.style.backgroundColor = farben[Math.floor(Math.random() * farben.length)]; 
        
        konfetti.style.width = Math.random() * 8 + 6 + 'px';
        konfetti.style.height = Math.random() * 8 + 6 + 'px';
        
        const dauer = Math.random() * 3 + 2; 
        const verzoegerung = Math.random() * 2; 
        
        konfetti.style.animationDuration = dauer + 's';
        konfetti.style.animationDelay = verzoegerung + 's';
        
        document.body.appendChild(konfetti);
        
        setTimeout(() => {
            konfetti.remove();
        }, (dauer + verzoegerung) * 1000);
    }
}

// Blendet das Gewinn-Overlay aus, um das fertige Gitter anzuschauen
function spielfeldAnschauen() 
    {
    const winOverlay = document.getElementById("game-won-overlay");
    if (winOverlay) 
        {
        winOverlay.classList.add("hidden");
        }
    }

function geheZuHome() 
    {
    const loseOverlay = document.getElementById("game-over-overlay");
    if (loseOverlay) 
        {
        loseOverlay.classList.add("hidden");
        }
        
    const winOverlay = document.getElementById("game-won-overlay");
    if (winOverlay) 
        {
        winOverlay.classList.add("hidden");
        }

    zeigeInhalt('home'); 
    }

function spielNeustarten() 
    {
    const loseOverlay = document.getElementById("game-over-overlay");
    if (loseOverlay) 
        {
        loseOverlay.classList.add("hidden");
        }
        
    const winOverlay = document.getElementById("game-won-overlay");
    if (winOverlay) 
        {
        winOverlay.classList.add("hidden");
        }
    
    // Variablen zurücksetzen
    sekunden = 0;
    spielLaeuft = false;
    verbleibendeWuermer = 10;
    
    const zaehlerElement = document.getElementById('wurm-zaehler');
    if (zaehlerElement) 
        {
        zaehlerElement.innerText = verbleibendeWuermer;
        }

    const timerElement = document.getElementById('timer');
    if (timerElement) 
        {
        timerElement.innerText = "00:00";
        }
    
    // Manuelle Styles vom roten Todes-Feld entfernen
    const alleKae = document.getElementById('spielfeld')?.children;
    if (alleKae) 
        {
        for (let i = 0; i < alleKae.length; i++) 
            {
            alleKae[i].style.backgroundColor = "";
            alleKae[i].style.color = "";
            }
        }
    
    baueSpielfeld();
    }

// ==========================================
// 7. INIZIALISIERUNG BEIM START
// ==========================================
window.onload = function()
    {
    aktualisiereProfilAnzeige();
    ladeNachrichten(); 
    };


// NEU: Macht das Game-Over-Overlay unsichtbar, um die Minen zu analysieren
function spielfeldAnschauenVerloren() 
    {
    const loseOverlay = document.getElementById("game-over-overlay");
    if (loseOverlay) 
        {
        loseOverlay.classList.add("hidden");
        }
    }

// Öffnet und schließt die Sidebar auf dem Smartphone
function toggleSidebar() 
    {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) 
        {
        sidebar.classList.toggle('offen');
        }
    }

// Komfort-Funktion: Wenn man auf dem Handy auf einen Menüpunkt klickt, 
// soll sich die Sidebar danach automatisch wieder schließen!
const alteZeigeInhalt = zeigeInhalt;
zeigeInhalt = function(seitenId) 
    {
    alteZeigeInhalt(seitenId); // Führt deine normale Seitensteuerung aus
    
    // Schließt die Sidebar auf dem Handy nach dem Klick
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('offen')) 
        {
        sidebar.classList.remove('offen');
        }
    };