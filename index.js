const {
    default: makeWASocket,
	MessageType, 
    MessageOptions, 
    Mimetype,
	DisconnectReason,
    useSingleFileAuthState
} = require("@adiwajshing/baileys");

const { Boom } =require("@hapi/boom");
const {state, saveState} = useSingleFileAuthState("./auth_info.json");
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

const express = require("express");
const bodyParser = require("body-parser");
const app = require("express")();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const axios = require("axios");
const port = process.env.PORT || 8000;

let helpText = `
RNDBot WhatsApp

Hello Anonymous
Berikut List Command RNDBot :
/help       - Show List Command
/ping       - Pong
/sticker    - Convert Image to Sticker

Berikut List Command RNDBot *Group Only
/tagAll     - Tag All Group Members
/kick @x    - Kick @x from Group
/promote @x - Make @x an Admin
/demote @x  - Demote @x from Admin
`;

helpText = () =>{
    let x = ''
    for (let index = 0; index < 20; index++) {
        x += 'Hi\n';
    }
    return x;
}

//fungsi suara capital 
function capital(textSound){
    const arr = textSound.split(" ");
    for (var i = 0; i < arr.length; i++) {
        arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
    }
    const str = arr.join(" ");
    return str;

}

async function connectToWhatsApp() {
    
    const sock = makeWASocket({auth: state,printQRInTerminal: true});

    sock.ev.on('connection.update', (update) => {
    	//console.log(update);
        const { connection, lastDisconnect } = update;
        if(connection === 'close') {
            let reason = new Boom(lastDisconnect.error).output.statusCode;
			if (reason === DisconnectReason.badSession) {
				console.log("Bad Session File, Please Delete file session and Scan Again");
				sock.logout();
				if (fs.existsSync('auth_info.json')) {
					fs.unlink('auth_info.json', function (err) {
						if (err) throw err;
						console.log('File deleted!');
					});
				};
				connectToWhatsApp();
			} else if (reason === DisconnectReason.connectionClosed) {
				console.log("Connection closed, reconnecting....");
				connectToWhatsApp();
			} else if (reason === DisconnectReason.connectionLost) {
				console.log("Connection Lost from Server, reconnecting...");
				connectToWhatsApp();
			} else if (reason === DisconnectReason.connectionReplaced) {
				console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First");
				sock.logout();
			} else if (reason === DisconnectReason.loggedOut) {
				console.log("Device Logged Out, Please Delete sesion and Scan Again.");
				sock.logout();
				if (fs.existsSync('auth_info.json')) {
					fs.unlink('auth_info.json', function (err) {
						if (err) throw err;
						console.log('File deleted!');
					});
				};
				connectToWhatsApp();
			} else if (reason === DisconnectReason.restartRequired) {
				console.log("Restart Required, Restarting...");
				connectToWhatsApp();
			} else if (reason === DisconnectReason.timedOut) {
				console.log("Connection TimedOut, Reconnecting...");
				connectToWhatsApp();
			} else {
				sock.end(`Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`);				
			}
        } else if(connection === 'open') {
            console.log('opened connection');
        }
    });

    sock.ev.on("creds.update", saveState);

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        
        //console.log(messages);
        
        if(type === "notify"){
            if(!messages[0].key.fromMe && !messages[0].key.participant) {

                //tentukan jenis pesan berbentuk text                
                const pesan = messages[0].message.conversation;
                //tentukan jenis pesan apakah bentuk list
                const responseList = messages[0].message.listResponseMessage;
                //tentukan jenis pesan apakah bentuk button
                const responseButton = messages[0].message.buttonsResponseMessage;
                
				//tentukan jenis pesan apakah bentuk templateButtonReplyMessage
                const responseReplyButton = messages[0].message.templateButtonReplyMessage;
                
				//nowa dari pengirim pesan sebagai id
                const noWa = messages[0].key.remoteJid;
                
				await sock.readMessages([messages[0].key]);
                //kecilkan semua pesan yang masuk lowercase
                const pesanMasuk = pesan.toLowerCase();

                const msgPrefix = (msg) => {
                    const prefix = '/'
                    return prefix + msg;
                }
                
                if(!messages[0].key.fromMe && pesanMasuk === msgPrefix('ping')){
                    await sock.sendMessage(noWa, {text: "PONG!"},{quoted: messages[0] });
                }else if(!messages[0].key.fromMe && pesanMasuk === msgPrefix('help')){
                    await sock.sendMessage(noWa, {text: helpText()},{quoted: messages[0] });
                }
                else if(!messages[0].key.fromMe && pesanMasuk === "btn") {
                    const buttons = [
                        {buttonId: "id1", buttonText: {displayText: 'Info 1!'}, type: 1},
                        {buttonId: "id2", buttonText: {displayText: 'Info 2!'}, type: 1},
                        {buttonId: "id3", buttonText: {displayText: '💵 Info 3'}, type: 1}
                    ]
                    const buttonInfo = {
                        text: "Info Warung Kopi",
                        buttons: buttons,
                        headerType: 1,
						viewOnce:true
                    }
                    await sock.sendMessage(noWa, buttonInfo, {quoted: messages[0]});
                    
                }   
                else if(!messages[0].key.fromMe && pesanMasuk === "img") {
					const buttons = [
                        {buttonId: "id1", buttonText: {displayText: 'Info 1!'}, type: 1},
                        {buttonId: "id2", buttonText: {displayText: 'Info 2!'}, type: 1},
                        {buttonId: "id3", buttonText: {displayText: '💵 Info 3'}, type: 1}
                    ]
                    await sock.sendMessage(noWa, { 
                        image: {
                            url:"./image/KopiJahe.jpeg"
                        },
                        caption:"Ini Kopi Jahe",
						buttons: buttons,
						viewOnce:true
                    });
                }
                else if(!messages[0].key.fromMe && pesanMasuk === "sound") {

                    textsound = capital("ini adalah pesan suara dari Robot Whastapp");

                    let API_URL = "https://texttospeech.responsivevoice.org/v1/text:synthesize?text="+textsound+"&lang=id&engine=g3&name=&pitch=0.5&rate=0.5&volume=1&key=kvfbSITh&gender=male";
                    file = fs.createWriteStream("./sound.mp3");
                    const request = https.get(API_URL, async function(response) {
                        await response.pipe(file);
                        response.on("end",async function(){    
                            await sock.sendMessage(noWa, { 
                                audio: { 
                                    url: "sound.mp3",
                                    caption: textsound 
                                }, 
                                mimetype: 'audio/mp4',
								viewOnce:true
                            });
                        });
                    });
                }
                else if (!messages[0].key.fromMe && responseList){

                    //cek row id yang dipilih 
                    const pilihanlist = responseList.singleSelectReply.selectedRowId;
                    
                    if(pilihanlist == 1) {
                        await sock.sendMessage(noWa, { text: "Anda Memilih Item Makanan Nasi Goreng "});
                    }
                    else if (pilihanlist == 2) {
                        await sock.sendMessage(noWa, { text: "Anda Memilih Item Makanan Mie Goreng "});
                    }
                    else if (pilihanlist == 3) {
                        await sock.sendMessage(noWa, { text: "Anda Memilih Item Makanan Bakso Goreng "});
                    }
                    else if (pilihanlist == 4) {
                        await sock.sendMessage(noWa, { 
                            image: {
                                url:"./image/KopiJahe.jpeg"
                            },
                            caption:"Anda Memilih Item Minuman Kopi Jahe",
							viewOnce:true
                        });
                    }
                    else if (pilihanlist == 5) {
                        await sock.sendMessage(noWa, { 
                            image: {
                                url:"./image/KopiSusu.jpeg"
                            },
                            caption:"Anda Memilih Item Minuman Kopi Susu",
							viewOnce:true
                        });
                    }
                    else{
                        await sock.sendMessage(noWa, {text: "Pilihan Invalid!"},{quoted: messages[0] });
                    }    
                }
                else if(!messages[0].key.fromMe && pesanMasuk === "pdf") {
                    let file = "putusan_1233_pdt.g_2018_pa.gs_20230116125746.pdf";
                    await sock.sendMessage(noWa, {
						document: { url: file },
						caption: "Pesan file", 
						fileName: file, 
						mimetype: file.mimetype 
					});
                }
				else if(!messages[0].key.fromMe && !messages[0].key.participant && pesanMasuk === "template"){
					const templateButtons = [
						{index: 0, urlButton: {displayText: 'Lihat sample!', url: 'https://youtube.com/@majacode'}},
						{index: 1, callButton: {displayText: 'Hotline CS', phoneNumber: '+6281252053792'}},
						{index: 2, quickReplyButton: {displayText: 'Oke Sudah jelas infonya min!', id: 'id-button_trims'}},
						{index: 3, quickReplyButton: {displayText: 'Kurang jelas!', id: 'id-button_kurang_jelas'}},
						{index: 4, quickReplyButton: {displayText: 'Siap, pesan 5000ton Wood Pellet!', id: 'id-langsung-order'}}
					]

					const templateMessage = {
						text: "Anda ingin segera order?",
						footer: 'Hubungi kami segera! untuk mendapatkan diskon terbaik',
						templateButtons: templateButtons,
						viewOnce : true
					}
					await sock.sendMessage(noWa, templateMessage, {quoted: messages[0]});
				
				}
				else if(!messages[0].key.fromMe && !messages[0].key.participant && responseReplyButton ){
					console.log(responseReplyButton);
					if(responseReplyButton.selectedId == "id-button_trims"){
						await sock.sendMessage(noWa, {
                            text:"*Terima kasih* sudah mengunjungi kami, \nSukses dan sehat selalu untuk *anda dan keluarga*."
                        });  
                    }
					else if(responseReplyButton.selectedId == "id-button_kurang_jelas") {
						await sock.sendMessage(noWa, {
                            text:"*Bila informasi kurang jelas* silahkan mengunjungi website kami di, \nhttps://www.youtube.com/watch?v=xF0Z6Te2yO8"
                        }); 
						console.log("Merasa kurang jelas");
					}
					else if(responseReplyButton.selectedId == "id-langsung-order") {
						await sock.sendMessage(noWa, {
                            text:"Silahkan kunjungi form *pesanan order * di tautan berikut:, \nhttps://www.docs.google.com/forms/d/1Ht5W_qnCOJpaAQlMSJpw0I8kp840iWeDiRJDHlOqLdk/edit"
                        }); 
						console.log("Alhamdulillah, Orangnya order hahha");
					}
				}
				else{
                    await sock.sendMessage(noWa, {text: "Saya adalah Bot!"},{quoted: messages[0] });
                }
            }		
		}

    });

}
// run in main file
connectToWhatsApp()
.catch (err => console.log("unexpected error: " + err) ) // catch any errors

server.listen(port, () => {
  console.log("Server Berjalan pada Port : " + port);
});
