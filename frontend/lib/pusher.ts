import Pusher from 'pusher-js';
import { getApiBaseUrl } from './urls/apiBase';
import { engineApi } from './engineApi';

export function getPusherClient() {
    return new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
        authorizer: (channel, options) => {
            return {
                authorize: (socketId, callback) => {
                    const params = new URLSearchParams();
                    params.append('socket_id', socketId);
                    params.append('channel_name', channel.name);
                    
                    engineApi.post('/chatbot/pusher/auth/', params, {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }).then(res => {
                        callback(null, res.data);
                    }).catch(err => {
                        callback(new Error(`Error calling auth endpoint: ${err}`), { auth: '' });
                    });
                }
            };
        }
    });
}
