import { IgApiClient } from 'instagram-private-api'

export async function initInsta() {
    const instaClient = new IgApiClient()
    instaClient.state.generateDevice(process.env.INSTA_USER || 'username');
    await instaClient.simulate.preLoginFlow()
    const loggedInUser = await instaClient.account.login(process.env.INSTA_USER || '', process.env.INSTA_PASSWORD || '');
    try {
        await instaClient.simulate.postLoginFlow()
    } catch (e) { }
    console.log('Logged in on Instagram as', loggedInUser.username)
    return instaClient
}