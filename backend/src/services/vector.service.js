// Import the Pinecone library
const { Pinecone } = require('@pinecone-database/pinecone')
const { PineconeStore } = require('@langchain/pinecone')
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { Document } = require('@langchain/core/documents')


const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const cohortChatGptIndex = pc.Index('cohort-chat-gpt')

const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-embedding-001",
    outputDimensionality: 768
});

let vectorStore
async function initVectorStore() {
    if (!vectorStore) {
        vectorStore = PineconeStore.fromExistingIndex(embeddings, {
            pineconeIndex: cohortChatGptIndex,

        });
    }
    return vectorStore
}


async function createMemory({ text, metadata, messageId }) {
    const vectorStore = await initVectorStore()
    const doc = new Document({
        pageContent: text,
        metadata: {
            ...metadata,
        }
    });

    await vectorStore.addDocuments([doc], {
        ids: [String(messageId)]
    })


}

async function queryMemory({ query, limit = 5, metadata }) {
    const vectorStore = await initVectorStore()
    // console.log("Querying memory with query:", query, "limit:", limit, "metadata:", metadata.user);

    const retriever = vectorStore.asRetriever({
        searchType: "similarity",
        k: limit,
        filter: { user: String(metadata.user) },
        searchKwargs: {
            fetchK: 10
        }
    });


    return await retriever.invoke(query)

}

async function queryDocuments({
    query,
    limit = 10,
    metadata
}) {
    try {
        if(!metadata?.documentIds?.length){
            return []
        }
        const vectorStore = await initVectorStore();

        const retriever = vectorStore.asRetriever({
            searchType: "similarity",
            k: limit,
            filter: {
                user: String(metadata.user),
                chat: String(metadata.chat),
                type: "pdf_chunk",
                documentId: {
                    $in: metadata.documentIds.map(String)
                }
            },
            searchKwargs: {
                fetchK: 15
            }
        });

        return await retriever.invoke(query);
    }
    catch (error) {
        console.error("Error querying documents:", error);
        throw error;
    }
}

module.exports = {
    createMemory, queryMemory, initVectorStore, queryDocuments
}